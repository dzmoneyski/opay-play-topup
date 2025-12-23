
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
  transfer_id UUID;
  sender_phone_record TEXT;
  _fee_config JSONB;
  _fee_info JSONB;
  _total_deducted NUMERIC;
  _is_activated BOOLEAN;
  _current_balance NUMERIC;
  _transaction_number TEXT;
BEGIN
  -- Get current user
  sender_user_id := auth.uid();
  
  IF sender_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Check if sender account is activated
  SELECT is_account_activated INTO _is_activated
  FROM public.profiles
  WHERE user_id = sender_user_id;
  
  IF NOT COALESCE(_is_activated, false) THEN
    RETURN json_build_object('success', false, 'error', 'يجب تفعيل حسابك أولاً لإجراء التحويلات');
  END IF;

  -- REMOVED: Rate limit check - no limits on transfers

  -- INPUT VALIDATION (removed upper limit)
  IF amount_param IS NULL OR amount_param <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ غير صحيح');
  END IF;

  IF recipient_phone_param IS NULL OR recipient_phone_param !~ '^[0-9+]{10,15}$' THEN
    RETURN json_build_object('success', false, 'error', 'رقم الهاتف غير صحيح');
  END IF;

  IF note_param IS NOT NULL AND LENGTH(note_param) > 500 THEN
    RETURN json_build_object('success', false, 'error', 'الملاحظة طويلة جداً');
  END IF;

  -- Recalculate sender balance
  PERFORM public.recalculate_user_balance(sender_user_id);

  -- Find recipient by phone
  SELECT user_id INTO recipient_user_id
  FROM public.profiles
  WHERE phone = recipient_phone_param;

  IF recipient_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  -- Cannot transfer to yourself
  IF sender_user_id = recipient_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot transfer to yourself');
  END IF;

  -- Get sender phone
  SELECT phone INTO sender_phone_record
  FROM public.profiles
  WHERE user_id = sender_user_id;

  -- Get sender balance with lock
  SELECT * INTO sender_balance_record
  FROM public.user_balances
  WHERE user_id = sender_user_id
  FOR UPDATE;

  IF sender_balance_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sender balance not found');
  END IF;

  -- Check sufficient balance
  IF sender_balance_record.balance < amount_param THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Generate transaction number
  _transaction_number := public.generate_transfer_transaction_number();

  -- Create transfer record
  INSERT INTO public.transfers (
    sender_id, recipient_id, sender_phone, recipient_phone, amount, note, status, transaction_number
  ) VALUES (
    sender_user_id, recipient_user_id, sender_phone_record, recipient_phone_param, amount_param, note_param, 'completed', _transaction_number
  ) RETURNING id INTO transfer_id;

  -- Deduct from sender
  UPDATE public.user_balances
  SET balance = balance - amount_param, updated_at = now()
  WHERE user_id = sender_user_id;

  -- Add to recipient (create balance if not exists)
  INSERT INTO public.user_balances (user_id, balance)
  VALUES (recipient_user_id, amount_param)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_balances.balance + amount_param, updated_at = now();

  RETURN json_build_object(
    'success', true,
    'transfer_id', transfer_id,
    'recipient_id', recipient_user_id,
    'transaction_number', _transaction_number
  );
END;
$function$;
