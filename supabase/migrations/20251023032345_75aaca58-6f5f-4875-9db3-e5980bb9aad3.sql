-- Security Fix 1: Make identity-documents bucket private
-- This prevents direct public URL access to sensitive identity documents
UPDATE storage.buckets 
SET public = false 
WHERE id = 'identity-documents';

-- Security Fix 2: Add input validation to process_transfer function
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
  _fee_config JSONB;
  _fee_info JSONB;
  _total_deducted NUMERIC;
BEGIN
  -- Get current user
  sender_user_id := auth.uid();
  
  IF sender_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- INPUT VALIDATION: Amount must be positive and reasonable (max 1,000,000 DZD)
  IF amount_param IS NULL OR amount_param <= 0 OR amount_param > 1000000 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid amount: must be between 0.01 and 1,000,000 DZD');
  END IF;

  -- INPUT VALIDATION: Phone number format (10-15 digits, may include +)
  IF recipient_phone_param IS NULL OR recipient_phone_param !~ '^[0-9+]{10,15}$' THEN
    RETURN json_build_object('success', false, 'error', 'Invalid phone number format');
  END IF;

  -- INPUT VALIDATION: Note length (max 500 characters)
  IF note_param IS NOT NULL AND LENGTH(note_param) > 500 THEN
    RETURN json_build_object('success', false, 'error', 'Note too long: maximum 500 characters');
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

  -- Get transfer fee configuration
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'transfer_fees';
  
  -- Calculate fees (sender pays by default)
  _fee_info := public.calculate_fee(amount_param, _fee_config);
  _total_deducted := amount_param + (_fee_info->>'fee_amount')::NUMERIC;

  -- Get sender balance
  SELECT * INTO sender_balance_record 
  FROM public.user_balances 
  WHERE user_id = sender_user_id;
  
  IF sender_balance_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sender balance not found');
  END IF;

  -- Check if sender has enough balance (amount + fees)
  IF sender_balance_record.balance < _total_deducted THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance (including fees)');
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

  -- Record platform revenue
  PERFORM public.record_platform_revenue('transfer_fee', transfer_id, sender_user_id, _fee_info, amount_param);

  -- Update balances: sender pays amount + fees, recipient receives only amount
  UPDATE public.user_balances 
  SET balance = balance - _total_deducted, updated_at = now()
  WHERE user_id = sender_user_id;

  UPDATE public.user_balances 
  SET balance = balance + amount_param, updated_at = now()
  WHERE user_id = recipient_user_id;

  RETURN json_build_object(
    'success', true, 
    'transfer_id', transfer_id,
    'recipient_id', recipient_user_id,
    'fee_amount', (_fee_info->>'fee_amount')::NUMERIC,
    'total_deducted', _total_deducted
  );
END;
$function$;

-- Security Fix 3: Add input validation to approve_deposit function
CREATE OR REPLACE FUNCTION public.approve_deposit(_deposit_id uuid, _admin_id uuid, _notes text DEFAULT NULL::text, _adjusted_amount numeric DEFAULT NULL::numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
  _final_amount DECIMAL(10,2);
  _original_amount DECIMAL(10,2);
  _fee_config JSONB;
  _fee_info JSONB;
  _net_amount DECIMAL(10,2);
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve deposits';
  END IF;
  
  -- Get original deposit amount
  SELECT amount INTO _original_amount
  FROM public.deposits
  WHERE id = _deposit_id;

  IF _original_amount IS NULL THEN
    RAISE EXCEPTION 'Deposit not found';
  END IF;

  -- INPUT VALIDATION: If adjusted amount provided, validate it
  IF _adjusted_amount IS NOT NULL THEN
    IF _adjusted_amount <= 0 OR _adjusted_amount > 10000000 THEN
      RAISE EXCEPTION 'Invalid adjusted amount: must be between 0.01 and 10,000,000 DZD';
    END IF;
    _final_amount := _adjusted_amount;
  ELSE
    _final_amount := _original_amount;
  END IF;
  
  -- Get deposit details and update it
  UPDATE public.deposits 
  SET status = 'approved',
      processed_at = now(),
      processed_by = _admin_id,
      admin_notes = _notes,
      amount = _final_amount
  WHERE id = _deposit_id
  RETURNING user_id INTO _user_id;
  
  -- Get deposit fee configuration
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'deposit_fees';
  
  -- Calculate fees
  _fee_info := public.calculate_fee(_final_amount, _fee_config);
  _net_amount := (_fee_info->>'net_amount')::NUMERIC;
  
  -- Record platform revenue
  PERFORM public.record_platform_revenue('deposit_fee', _deposit_id, _user_id, _fee_info, _final_amount);
  
  -- Create user balance if it doesn't exist
  INSERT INTO public.user_balances (user_id, balance)
  VALUES (_user_id, 0.00)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Add the NET amount to user balance (after deducting fees)
  UPDATE public.user_balances 
  SET balance = balance + _net_amount,
      updated_at = now()
  WHERE user_id = _user_id;
END;
$function$;

-- Security Fix 4: Enhance withdrawal validation trigger
CREATE OR REPLACE FUNCTION public.validate_withdrawal_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _current_balance DECIMAL(10,2);
BEGIN
  -- INPUT VALIDATION: Amount must be positive and within limits (500 - 200,000 DZD)
  IF NEW.amount IS NULL OR NEW.amount < 500 OR NEW.amount > 200000 THEN
    RAISE EXCEPTION 'Invalid withdrawal amount: must be between 500 and 200,000 DZD';
  END IF;

  -- INPUT VALIDATION: Withdrawal method is required
  IF NEW.withdrawal_method IS NULL OR TRIM(NEW.withdrawal_method) = '' THEN
    RAISE EXCEPTION 'Withdrawal method is required';
  END IF;

  -- INPUT VALIDATION: Validate method-specific fields
  IF NEW.withdrawal_method IN ('bank_transfer', 'ccp', 'baridi_mob') THEN
    IF NEW.account_number IS NULL OR TRIM(NEW.account_number) = '' THEN
      RAISE EXCEPTION 'Account number is required for this withdrawal method';
    END IF;
    IF NEW.account_holder_name IS NULL OR TRIM(NEW.account_holder_name) = '' THEN
      RAISE EXCEPTION 'Account holder name is required for this withdrawal method';
    END IF;
    -- Validate account number format (5-30 characters, alphanumeric)
    IF LENGTH(NEW.account_number) < 5 OR LENGTH(NEW.account_number) > 30 THEN
      RAISE EXCEPTION 'Invalid account number length';
    END IF;
  END IF;

  IF NEW.withdrawal_method = 'cash' THEN
    IF NEW.cash_location IS NULL OR TRIM(NEW.cash_location) = '' THEN
      RAISE EXCEPTION 'Cash pickup location is required for cash withdrawals';
    END IF;
  END IF;

  -- INPUT VALIDATION: Notes length limit (max 1000 characters)
  IF NEW.notes IS NOT NULL AND LENGTH(NEW.notes) > 1000 THEN
    RAISE EXCEPTION 'Notes too long: maximum 1000 characters';
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