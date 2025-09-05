-- 1) Recalculate balance to include withdrawal holds
CREATE OR REPLACE FUNCTION public.recalculate_user_balance(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _total_approved DECIMAL(10,2);
  _total_sent DECIMAL(10,2);
  _total_received DECIMAL(10,2);
  _total_withdrawal_holds DECIMAL(10,2);
  _final_balance DECIMAL(10,2);
BEGIN
  -- Total approved deposits
  SELECT COALESCE(SUM(amount), 0.00) INTO _total_approved
  FROM public.deposits 
  WHERE user_id = _user_id AND status = 'approved';
  
  -- Total sent transfers
  SELECT COALESCE(SUM(amount), 0.00) INTO _total_sent
  FROM public.transfers 
  WHERE sender_id = _user_id AND status = 'completed';
  
  -- Total received transfers
  SELECT COALESCE(SUM(amount), 0.00) INTO _total_received
  FROM public.transfers 
  WHERE recipient_id = _user_id AND status = 'completed';

  -- Total withdrawal holds (pending/approved/completed are considered held)
  SELECT COALESCE(SUM(amount), 0.00) INTO _total_withdrawal_holds
  FROM public.withdrawals
  WHERE user_id = _user_id AND status IN ('pending','approved','completed');
  
  -- Final available balance
  _final_balance := _total_approved + _total_received - _total_sent - _total_withdrawal_holds;
  
  -- Upsert user's balance
  INSERT INTO public.user_balances (user_id, balance)
  VALUES (_user_id, _final_balance)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = EXCLUDED.balance,
    updated_at = now();
END;
$function$;

-- 2) Trigger function to validate balance before creating a withdrawal (prevents overdraft)
CREATE OR REPLACE FUNCTION public.validate_withdrawal_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _current_balance DECIMAL(10,2);
BEGIN
  -- Basic validation
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal amount must be greater than zero';
  END IF;

  -- Ensure balance is freshly calculated
  PERFORM public.recalculate_user_balance(NEW.user_id);

  -- Read current available balance
  SELECT balance INTO _current_balance
  FROM public.user_balances
  WHERE user_id = NEW.user_id;

  IF COALESCE(_current_balance, 0.00) < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient balance for withdrawal';
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_withdrawals_validate_before_insert'
  ) THEN
    CREATE TRIGGER trg_withdrawals_validate_before_insert
    BEFORE INSERT ON public.withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_withdrawal_before_insert();
  END IF;
END$$;

-- 3) Trigger function to recalc balance whenever withdrawals change
CREATE OR REPLACE FUNCTION public.update_balance_on_withdrawal_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.recalculate_user_balance(NEW.user_id);
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      PERFORM public.recalculate_user_balance(OLD.user_id);
    END IF;
    PERFORM public.recalculate_user_balance(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_withdrawals_recalc_after_change'
  ) THEN
    CREATE TRIGGER trg_withdrawals_recalc_after_change
    AFTER INSERT OR UPDATE ON public.withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_balance_on_withdrawal_change();
  END IF;
END$$;

-- 4) Update approve_withdrawal to stop direct balance deduction and rely on recalc
CREATE OR REPLACE FUNCTION public.approve_withdrawal(_withdrawal_id uuid, _admin_id uuid, _notes text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
BEGIN
  -- Ensure caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve withdrawals';
  END IF;
  
  -- Approve withdrawal
  UPDATE public.withdrawals 
  SET status = 'approved',
      processed_at = now(),
      processed_by = _admin_id,
      admin_notes = _notes
  WHERE id = _withdrawal_id
  RETURNING user_id INTO _user_id;
  
  -- Mark as completed
  UPDATE public.withdrawals 
  SET status = 'completed'
  WHERE id = _withdrawal_id;

  -- Recalculate to persist final state (hold remains, already accounted)
  PERFORM public.recalculate_user_balance(_user_id);
END;
$function$;

-- 5) Update reject_withdrawal to release the hold via recalc
CREATE OR REPLACE FUNCTION public.reject_withdrawal(_withdrawal_id uuid, _admin_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
BEGIN
  -- Ensure caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can reject withdrawals';
  END IF;
  
  -- Reject withdrawal
  UPDATE public.withdrawals 
  SET status = 'rejected',
      processed_at = now(),
      processed_by = _admin_id,
      admin_notes = _reason
  WHERE id = _withdrawal_id
  RETURNING user_id INTO _user_id;

  -- Recalculate to release the hold
  PERFORM public.recalculate_user_balance(_user_id);
END;
$function$;

-- 6) Ensure transfers check the latest balance (respects holds)
CREATE OR REPLACE FUNCTION public.process_transfer(recipient_phone_param text, amount_param numeric, note_param text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sender_user_id UUID;
  recipient_user_id UUID;
  sender_balance_record RECORD;
  recipient_balance_record RECORD;
  transfer_id UUID;
  sender_phone_record TEXT;
BEGIN
  -- Get current user
  sender_user_id := auth.uid();
  
  IF sender_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Recalculate sender balance to include latest holds
  PERFORM public.recalculate_user_balance(sender_user_id);

  -- Get sender's phone
  SELECT phone INTO sender_phone_record 
  FROM public.profiles 
  WHERE user_id = sender_user_id;

  -- Find recipient by phone
  SELECT user_id INTO recipient_user_id
  FROM public.profiles 
  WHERE phone = recipient_phone_param;
  
  IF recipient_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  IF sender_user_id = recipient_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot transfer to yourself');
  END IF;

  -- Get sender balance
  SELECT * INTO sender_balance_record 
  FROM public.user_balances 
  WHERE user_id = sender_user_id;
  
  IF sender_balance_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sender balance not found');
  END IF;

  -- Check if sender has enough balance
  IF sender_balance_record.balance < amount_param THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Get or create recipient balance
  SELECT * INTO recipient_balance_record 
  FROM public.user_balances 
  WHERE user_id = recipient_user_id;
  
  IF recipient_balance_record IS NULL THEN
    INSERT INTO public.user_balances (user_id, balance)
    VALUES (recipient_user_id, 0)
    RETURNING * INTO recipient_balance_record;
  END IF;

  -- Create transfer record
  INSERT INTO public.transfers (sender_id, recipient_id, sender_phone, recipient_phone, amount, note)
  VALUES (sender_user_id, recipient_user_id, sender_phone_record, recipient_phone_param, amount_param, note_param)
  RETURNING id INTO transfer_id;

  -- Update balances
  UPDATE public.user_balances 
  SET balance = balance - amount_param, updated_at = now()
  WHERE user_id = sender_user_id;

  UPDATE public.user_balances 
  SET balance = balance + amount_param, updated_at = now()
  WHERE user_id = recipient_user_id;

  RETURN json_build_object(
    'success', true, 
    'transfer_id', transfer_id,
    'recipient_id', recipient_user_id
  );
END;
$function$;