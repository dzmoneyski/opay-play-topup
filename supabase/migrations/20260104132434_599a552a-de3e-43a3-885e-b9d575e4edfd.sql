
-- حذف الدوال القديمة أولاً ثم إعادة إنشائها بشكل صحيح
DROP FUNCTION IF EXISTS public.recalculate_user_balance(uuid);
DROP FUNCTION IF EXISTS public.process_transfer(text, numeric, text);

-- إعادة إنشاء دالة recalculate_user_balance مع إرجاع القيمة الحقيقية (بدون إعادة السالب إلى 0)
CREATE FUNCTION public.recalculate_user_balance(_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total_deposits NUMERIC;
  _total_gift_cards NUMERIC;
  _total_transfers_sent NUMERIC;
  _total_transfers_received NUMERIC;
  _total_withdrawals NUMERIC;
  _total_withdrawal_fees NUMERIC;
  _total_transfer_fees NUMERIC;
  _total_game_topups NUMERIC;
  _total_phone_topups NUMERIC;
  _total_digital_cards NUMERIC;
  _total_betting NUMERIC;
  _final_balance NUMERIC;
BEGIN
  -- Approved deposits (net after deposit fees)
  SELECT COALESCE(SUM(d.amount), 0) 
    - COALESCE(SUM(COALESCE(pl.fee_amount, 0)), 0)
  INTO _total_deposits
  FROM public.deposits d
  LEFT JOIN public.platform_ledger pl
    ON pl.transaction_id = d.id AND pl.transaction_type = 'deposit_fee'
  WHERE d.user_id = _user_id AND d.status = 'approved';

  -- Redeemed gift cards
  SELECT COALESCE(SUM(amount), 0) INTO _total_gift_cards
  FROM public.gift_cards
  WHERE used_by = _user_id AND is_used = true;

  -- Completed outgoing transfers
  SELECT COALESCE(SUM(amount), 0) INTO _total_transfers_sent
  FROM public.transfers
  WHERE sender_id = _user_id AND status = 'completed';

  -- Completed incoming transfers
  SELECT COALESCE(SUM(amount), 0) INTO _total_transfers_received
  FROM public.transfers
  WHERE recipient_id = _user_id AND status = 'completed';

  -- Transfer fees
  SELECT COALESCE(SUM(fee_amount), 0) INTO _total_transfer_fees
  FROM public.platform_ledger
  WHERE user_id = _user_id AND transaction_type = 'transfer_fee';

  -- Withdrawals (pending + approved + completed)
  SELECT COALESCE(SUM(amount), 0) INTO _total_withdrawals
  FROM public.withdrawals
  WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed');

  -- Withdrawal fees
  SELECT COALESCE(SUM(pl.fee_amount), 0) INTO _total_withdrawal_fees
  FROM public.platform_ledger pl
  INNER JOIN public.withdrawals w ON pl.transaction_id = w.id
  WHERE pl.user_id = _user_id 
    AND pl.transaction_type = 'withdrawal_fee'
    AND w.status IN ('pending', 'approved', 'completed');

  -- Pending game topups
  SELECT COALESCE(SUM(amount), 0) INTO _total_game_topups
  FROM public.game_topup_orders
  WHERE user_id = _user_id AND status = 'pending';

  -- Pending phone topups
  SELECT COALESCE(SUM(amount), 0) INTO _total_phone_topups
  FROM public.phone_topup_orders
  WHERE user_id = _user_id AND status = 'pending';

  -- Pending digital cards
  SELECT COALESCE(SUM(total_dzd), 0) INTO _total_digital_cards
  FROM public.digital_card_orders
  WHERE user_id = _user_id AND status = 'pending';

  -- Pending betting
  SELECT COALESCE(SUM(amount), 0) INTO _total_betting
  FROM public.betting_transactions
  WHERE user_id = _user_id AND transaction_type = 'deposit' AND status = 'pending';

  -- Calculate final balance
  _final_balance := _total_deposits
                  + _total_gift_cards
                  + _total_transfers_received
                  - _total_transfers_sent
                  - _total_transfer_fees
                  - _total_withdrawals
                  - _total_withdrawal_fees
                  - _total_game_topups
                  - _total_phone_topups
                  - _total_digital_cards
                  - _total_betting;

  -- ⚠️ لا نعيد السالب إلى 0 - نحتفظ بالقيمة الحقيقية

  -- Upsert balance
  INSERT INTO public.user_balances (user_id, balance, updated_at)
  VALUES (_user_id, _final_balance, now())
  ON CONFLICT (user_id)
  DO UPDATE SET balance = EXCLUDED.balance, updated_at = EXCLUDED.updated_at;

  RETURN _final_balance;
END;
$$;

-- إعادة إنشاء دالة process_transfer مع التحقق الصارم من الرصيد
CREATE FUNCTION public.process_transfer(
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
  sender_balance NUMERIC;
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

  -- Validate amount
  IF amount_param IS NULL OR amount_param <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ غير صحيح');
  END IF;

  -- Validate phone
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

  -- Get sender phone
  SELECT phone INTO sender_phone_record
  FROM public.profiles
  WHERE user_id = sender_user_id;

  -- Get fee config
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

  -- ✅ إعادة حساب الرصيد الحقيقي (قد يكون سالباً)
  sender_balance := public.recalculate_user_balance(sender_user_id);

  -- قفل الصف لمنع التعديلات المتزامنة
  PERFORM 1 FROM public.user_balances
  WHERE user_id = sender_user_id
  FOR UPDATE;

  -- Determine who pays the fee
  IF _paid_by = 'recipient' THEN
    payer_user_id := recipient_user_id;
    _total_needed_sender := amount_param;
  ELSE
    payer_user_id := sender_user_id;
    _total_needed_sender := amount_param + _fee_amount;
  END IF;

  -- ✅ التحقق الصارم من الرصيد
  IF sender_balance < _total_needed_sender THEN
    RETURN json_build_object(
      'success', false,
      'error', 'الرصيد غير كافي. رصيدك الحالي: ' || GREATEST(sender_balance, 0)::TEXT || ' دج، وتحتاج: ' || _total_needed_sender::TEXT || ' دج'
    );
  END IF;

  -- If recipient pays fee, check they can afford it
  IF _paid_by = 'recipient' AND _fee_amount > 0 THEN
    PERFORM public.recalculate_user_balance(recipient_user_id);

    SELECT * INTO recipient_balance_record
    FROM public.user_balances
    WHERE user_id = recipient_user_id
    FOR UPDATE;

    IF COALESCE(recipient_balance_record.balance, 0) + amount_param < _fee_amount THEN
      RETURN json_build_object(
        'success', false,
        'error', 'المستلم لن يكون لديه رصيد كافٍ لدفع العمولة'
      );
    END IF;
  END IF;

  -- Generate transaction number
  _transaction_number := public.generate_transfer_transaction_number();

  -- Create transfer
  INSERT INTO public.transfers (
    sender_id, sender_phone, recipient_id, recipient_phone,
    amount, note, status, transaction_number, created_at, updated_at
  ) VALUES (
    sender_user_id, sender_phone_record, recipient_user_id, _cleaned_phone,
    amount_param, note_param, 'completed', _transaction_number, now(), now()
  )
  RETURNING id INTO transfer_id;

  -- Record fee
  IF _fee_amount > 0 THEN
    INSERT INTO public.platform_ledger (
      user_id, transaction_type, transaction_id, original_amount,
      fee_amount, fee_percentage, fee_fixed, currency, created_at
    ) VALUES (
      payer_user_id, 'transfer_fee', transfer_id, amount_param,
      _fee_amount, _fee_percentage, _fee_fixed, 'DZD', now()
    );
  END IF;

  -- Recalculate balances
  PERFORM public.recalculate_user_balance(sender_user_id);
  PERFORM public.recalculate_user_balance(recipient_user_id);

  RETURN json_build_object(
    'success', true,
    'transfer_id', transfer_id,
    'transaction_number', _transaction_number,
    'amount', amount_param,
    'fee_amount', _fee_amount,
    'fee_paid_by', _paid_by,
    'recipient_phone', _cleaned_phone
  );
END;
$$;
