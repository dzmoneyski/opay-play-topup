-- تحديث دالة إنشاء السحب لتخصم المبلغ + الرسوم من رصيد المستخدم
CREATE OR REPLACE FUNCTION public.create_withdrawal(
  _amount numeric,
  _withdrawal_method text,
  _account_number text DEFAULT NULL,
  _account_holder_name text DEFAULT NULL,
  _cash_location text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID;
  _current_balance NUMERIC;
  _fee_config JSONB;
  _fee_info JSONB;
  _fee_amount NUMERIC;
  _net_amount NUMERIC;
  _total_deducted NUMERIC;
  _withdrawal_id UUID;
  _is_activated BOOLEAN;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;

  -- التحقق من تفعيل الحساب
  SELECT is_account_activated INTO _is_activated
  FROM public.profiles
  WHERE user_id = _user_id;
  
  IF NOT COALESCE(_is_activated, false) THEN
    RETURN json_build_object('success', false, 'error', 'يجب تفعيل حسابك أولاً');
  END IF;

  -- التحقق من صحة المبلغ
  IF _amount IS NULL OR _amount < 500 THEN
    RETURN json_build_object('success', false, 'error', 'الحد الأدنى للسحب 500 دج');
  END IF;

  IF _amount > 200000 THEN
    RETURN json_build_object('success', false, 'error', 'الحد الأقصى للسحب 200,000 دج');
  END IF;

  -- الحصول على إعدادات الرسوم
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'withdrawal_fees';

  -- حساب الرسوم
  _fee_info := public.calculate_fee(_amount, _fee_config);
  _fee_amount := COALESCE((_fee_info->>'fee_amount')::NUMERIC, 0);
  
  -- net_amount = المبلغ الذي سيستلمه المستخدم (المبلغ المطلوب كاملاً)
  _net_amount := _amount;
  
  -- إجمالي الخصم من الرصيد = المبلغ + الرسوم
  _total_deducted := _amount + _fee_amount;

  -- قفل صف الرصيد لمنع السحب المتزامن
  SELECT balance INTO _current_balance
  FROM public.user_balances
  WHERE user_id = _user_id
  FOR UPDATE;

  IF COALESCE(_current_balance, 0) < _total_deducted THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'الرصيد غير كافي. تحتاج ' || _total_deducted || ' دج (المبلغ ' || _amount || ' + الرسوم ' || _fee_amount || ' دج). رصيدك: ' || COALESCE(_current_balance, 0) || ' دج'
    );
  END IF;

  -- إنشاء طلب السحب
  INSERT INTO public.withdrawals (
    user_id,
    amount,
    withdrawal_method,
    account_number,
    account_holder_name,
    cash_location,
    notes,
    fee_amount,
    net_amount,
    fee_percentage,
    fee_fixed,
    status
  ) VALUES (
    _user_id,
    _amount,
    _withdrawal_method,
    _account_number,
    _account_holder_name,
    _cash_location,
    _notes,
    _fee_amount,
    _net_amount,
    COALESCE((_fee_info->>'fee_percentage')::NUMERIC, 0),
    COALESCE((_fee_info->>'fee_fixed')::NUMERIC, 0),
    'pending'
  ) RETURNING id INTO _withdrawal_id;

  -- تسجيل رسوم السحب في platform_ledger فوراً
  INSERT INTO public.platform_ledger (
    transaction_id,
    transaction_type,
    user_id,
    original_amount,
    fee_amount,
    fee_percentage,
    fee_fixed,
    currency
  ) VALUES (
    _withdrawal_id,
    'withdrawal_fee',
    _user_id,
    _amount,
    _fee_amount,
    COALESCE((_fee_info->>'fee_percentage')::NUMERIC, 0),
    COALESCE((_fee_info->>'fee_fixed')::NUMERIC, 0),
    'DZD'
  );

  -- خصم المبلغ + الرسوم من الرصيد فوراً
  UPDATE public.user_balances
  SET balance = balance - _total_deducted,
      updated_at = now()
  WHERE user_id = _user_id;

  RETURN json_build_object(
    'success', true,
    'withdrawal_id', _withdrawal_id,
    'amount', _amount,
    'fee_amount', _fee_amount,
    'total_deducted', _total_deducted,
    'message', 'تم إرسال طلب السحب بنجاح'
  );
END;
$$;

-- تحديث دالة إعادة حساب الرصيد لتخصم المبلغ + الرسوم للسحوبات
CREATE OR REPLACE FUNCTION public.recalculate_user_balance(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  -- Approved deposits (net after deposit fees already in platform_ledger)
  SELECT COALESCE(SUM(d.amount), 0) 
    - COALESCE(SUM(COALESCE(pl.fee_amount, 0)), 0)
  INTO _total_deposits
  FROM public.deposits d
  LEFT JOIN public.platform_ledger pl
    ON pl.transaction_id = d.id AND pl.transaction_type = 'deposit_fee'
  WHERE d.user_id = _user_id AND d.status = 'approved';

  -- Redeemed gift cards (full face value)
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

  -- Transfer fees (from platform_ledger)
  SELECT COALESCE(SUM(fee_amount), 0) INTO _total_transfer_fees
  FROM public.platform_ledger
  WHERE user_id = _user_id AND transaction_type = 'transfer_fee';

  -- السحوبات (pending + approved + completed): المبلغ الأصلي فقط
  SELECT COALESCE(SUM(amount), 0) INTO _total_withdrawals
  FROM public.withdrawals
  WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed');

  -- رسوم السحب (من platform_ledger لجميع الحالات ما عدا المرفوضة)
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

  -- Pending digital cards (total_dzd already includes fee)
  SELECT COALESCE(SUM(total_dzd), 0) INTO _total_digital_cards
  FROM public.digital_card_orders
  WHERE user_id = _user_id AND status = 'pending';

  -- Pending betting deposits (amount + fee)
  SELECT COALESCE(SUM(amount), 0) INTO _total_betting
  FROM public.betting_transactions
  WHERE user_id = _user_id AND transaction_type = 'deposit' AND status = 'pending';

  -- Calculate final balance:
  -- + deposits (net)
  -- + gift cards
  -- + incoming transfers
  -- - outgoing transfers
  -- - transfer fees
  -- - withdrawals (المبلغ)
  -- - withdrawal fees (الرسوم)
  -- - pending game topups
  -- - pending phone topups
  -- - pending digital cards
  -- - pending betting
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

  -- Ensure no negative balance
  IF _final_balance < 0 THEN
    _final_balance := 0;
  END IF;

  -- Upsert balance
  INSERT INTO public.user_balances (user_id, balance, updated_at)
  VALUES (_user_id, _final_balance, now())
  ON CONFLICT (user_id)
  DO UPDATE SET balance = EXCLUDED.balance, updated_at = EXCLUDED.updated_at;
END;
$$;

-- تحديث دالة رفض السحب لإرجاع الرسوم أيضاً
CREATE OR REPLACE FUNCTION public.reject_withdrawal(_withdrawal_id uuid, _admin_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID;
  _fee_amount NUMERIC;
BEGIN
  -- Ensure caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can reject withdrawals';
  END IF;
  
  -- Get withdrawal info
  SELECT user_id, COALESCE(fee_amount, 0) INTO _user_id, _fee_amount
  FROM public.withdrawals
  WHERE id = _withdrawal_id;
  
  -- Reject withdrawal
  UPDATE public.withdrawals 
  SET status = 'rejected',
      processed_at = now(),
      processed_by = _admin_id,
      admin_notes = _reason
  WHERE id = _withdrawal_id;

  -- حذف سجل الرسوم من platform_ledger (لأن الطلب تم رفضه)
  DELETE FROM public.platform_ledger
  WHERE transaction_id = _withdrawal_id AND transaction_type = 'withdrawal_fee';

  -- Recalculate to release the hold (يرجع المبلغ + الرسوم للرصيد)
  PERFORM public.recalculate_user_balance(_user_id);
END;
$$;