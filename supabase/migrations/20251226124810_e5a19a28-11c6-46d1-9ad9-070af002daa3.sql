
-- Fix transfer processing to avoid double-deduction with transfer triggers
-- 1) Normalize any mistakenly recorded transfer fees
UPDATE public.platform_ledger
SET transaction_type = 'transfer_fee'
WHERE transaction_type = 'transfer';

-- 2) Recreate process_transfer with fee ledger inserted BEFORE transfer insert
CREATE OR REPLACE FUNCTION public.process_transfer(
  recipient_phone_param TEXT,
  amount_param NUMERIC,
  note_param TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_user_id UUID;
  recipient_user_id UUID;
  payer_user_id UUID;
  sender_balance_record RECORD;
  recipient_balance_record RECORD;
  transfer_id UUID;
  sender_phone_record TEXT;
  _is_activated BOOLEAN;
  _cleaned_phone TEXT;
  _fee_config JSONB;
  _fee_amount NUMERIC := 0;
  _fee_percentage NUMERIC := 0;
  _fee_fixed NUMERIC := 0;
  _total_needed_sender NUMERIC;
  _paid_by TEXT := 'sender';
  _transaction_number TEXT;
BEGIN
  sender_user_id := auth.uid();
  IF sender_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Must be activated
  SELECT is_account_activated INTO _is_activated
  FROM public.profiles
  WHERE user_id = sender_user_id;

  IF NOT COALESCE(_is_activated, false) THEN
    RETURN json_build_object('success', false, 'error', 'يجب تفعيل حسابك أولاً لإجراء التحويلات');
  END IF;

  -- Validate
  IF amount_param IS NULL OR amount_param <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ غير صحيح');
  END IF;

  _cleaned_phone := REGEXP_REPLACE(recipient_phone_param, '[^0-9+]', '', 'g');
  IF _cleaned_phone IS NULL OR _cleaned_phone !~ '^[0-9+]{10,15}$' THEN
    RETURN json_build_object('success', false, 'error', 'رقم الهاتف غير صحيح');
  END IF;

  IF note_param IS NOT NULL AND LENGTH(note_param) > 500 THEN
    RETURN json_build_object('success', false, 'error', 'الملاحظة طويلة جداً');
  END IF;

  -- Find recipient
  SELECT user_id INTO recipient_user_id
  FROM public.profiles
  WHERE phone = _cleaned_phone;

  IF recipient_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'رقم الهاتف غير مسجل في النظام');
  END IF;

  IF sender_user_id = recipient_user_id THEN
    RETURN json_build_object('success', false, 'error', 'لا يمكن التحويل إلى نفسك');
  END IF;

  -- Sender phone
  SELECT phone INTO sender_phone_record
  FROM public.profiles
  WHERE user_id = sender_user_id;

  -- Fee config
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'transfer_fees';

  IF _fee_config IS NOT NULL THEN
    _paid_by := COALESCE(NULLIF(_fee_config->>'paid_by',''), 'sender');
  END IF;

  IF _fee_config IS NOT NULL AND COALESCE((_fee_config->>'enabled')::boolean, false) = true THEN
    _fee_percentage := COALESCE((_fee_config->>'percentage')::numeric, 0);
    _fee_fixed := COALESCE((_fee_config->>'fixed_amount')::numeric, 0);

    _fee_amount := (amount_param * _fee_percentage / 100) + _fee_fixed;
    _fee_amount := GREATEST(_fee_amount, COALESCE((_fee_config->>'min_fee')::numeric, 0));
    _fee_amount := LEAST(_fee_amount, COALESCE((_fee_config->>'max_fee')::numeric, 999999));
    _fee_amount := ROUND(_fee_amount, 2);
  END IF;

  -- Ensure sender balance is fresh, then lock
  PERFORM public.recalculate_user_balance(sender_user_id);

  SELECT * INTO sender_balance_record
  FROM public.user_balances
  WHERE user_id = sender_user_id
  FOR UPDATE;

  IF sender_balance_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'لم يتم العثور على رصيدك');
  END IF;

  -- Determine who pays the fee
  IF _paid_by = 'recipient' THEN
    payer_user_id := recipient_user_id;
    _total_needed_sender := amount_param; -- sender only needs the amount
  ELSE
    payer_user_id := sender_user_id;
    _total_needed_sender := amount_param + _fee_amount;
  END IF;

  IF sender_balance_record.balance < _total_needed_sender THEN
    RETURN json_build_object(
      'success', false,
      'error', 'الرصيد غير كافي. تحتاج ' || _total_needed_sender || ' دج (المبلغ: ' || amount_param || CASE WHEN payer_user_id = sender_user_id THEN ' + العمولة: ' || _fee_amount ELSE '' END || ' دج)'
    );
  END IF;

  -- If recipient pays the fee, ensure they have/ will have enough after receiving.
  IF _paid_by = 'recipient' AND _fee_amount > 0 THEN
    PERFORM public.recalculate_user_balance(recipient_user_id);

    SELECT * INTO recipient_balance_record
    FROM public.user_balances
    WHERE user_id = recipient_user_id
    FOR UPDATE;

    IF COALESCE(recipient_balance_record.balance, 0) + amount_param < _fee_amount THEN
      RETURN json_build_object('success', false, 'error', 'رصيد المستلم غير كافٍ لدفع العمولة');
    END IF;
  END IF;

  -- Pre-generate transfer id so we can record fee BEFORE transfer insert (trigger will recalc balances)
  transfer_id := gen_random_uuid();

  -- Record fee (so the transfer trigger recalculation sees it)
  IF _fee_amount > 0 THEN
    INSERT INTO public.platform_ledger (
      user_id,
      transaction_type,
      transaction_id,
      original_amount,
      fee_amount,
      fee_percentage,
      fee_fixed,
      currency
    ) VALUES (
      payer_user_id,
      'transfer_fee',
      transfer_id,
      amount_param,
      _fee_amount,
      _fee_percentage,
      _fee_fixed,
      'DZD'
    );
  END IF;

  -- Create transfer record (balances will be updated by trigger_update_balance_on_transfer)
  INSERT INTO public.transfers (
    id,
    sender_id,
    recipient_id,
    sender_phone,
    recipient_phone,
    amount,
    note,
    status
  ) VALUES (
    transfer_id,
    sender_user_id,
    recipient_user_id,
    sender_phone_record,
    _cleaned_phone,
    amount_param,
    note_param,
    'completed'
  )
  RETURNING transaction_number INTO _transaction_number;

  RETURN json_build_object(
    'success', true,
    'transfer_id', transfer_id,
    'recipient_id', recipient_user_id,
    'transaction_number', _transaction_number,
    'fee_amount', _fee_amount,
    'total_deducted', CASE WHEN payer_user_id = sender_user_id THEN (amount_param + _fee_amount) ELSE amount_param END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'حدث خطأ أثناء التحويل، يرجى المحاولة مرة أخرى');
END;
$$;
