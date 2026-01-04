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
AS $function$
DECLARE
  _user_id UUID;
  _current_balance NUMERIC;
  _withdrawal_id UUID;
  _fee_config JSONB;
  _fee_info JSONB;
  _fee_amount NUMERIC;
  _net_amount NUMERIC;
  _fee_percentage NUMERIC;
  _fee_fixed NUMERIC;
  _is_activated BOOLEAN;
  _pending_count INTEGER;
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

  -- التحقق من عدم وجود طلبات سحب معلقة حديثة (خلال 5 دقائق)
  SELECT COUNT(*) INTO _pending_count
  FROM public.withdrawals
  WHERE user_id = _user_id 
    AND status = 'pending'
    AND created_at > now() - INTERVAL '5 minutes';
    
  IF _pending_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'لديك طلب سحب قيد المعالجة. يرجى الانتظار');
  END IF;

  -- الحصول على إعدادات الرسوم
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'withdrawal_fees';

  -- حساب الرسوم
  _fee_info := public.calculate_fee(_amount, _fee_config);
  _fee_amount := COALESCE((_fee_info->>'fee_amount')::NUMERIC, 0);
  _net_amount := COALESCE((_fee_info->>'net_amount')::NUMERIC, _amount);
  _fee_percentage := COALESCE((_fee_info->>'fee_percentage')::NUMERIC, 0);
  _fee_fixed := COALESCE((_fee_info->>'fee_fixed')::NUMERIC, 0);

  -- التحقق من الرصيد الحالي (يجب أن يكفي للمبلغ المطلوب فقط)
  -- الرسوم تُخصم من المبلغ المستلم وليس من الرصيد
  SELECT balance INTO _current_balance
  FROM public.user_balances
  WHERE user_id = _user_id
  FOR UPDATE;

  IF COALESCE(_current_balance, 0) < _amount THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'الرصيد غير كافي. رصيدك: ' || COALESCE(_current_balance, 0) || ' دج'
    );
  END IF;

  -- إنشاء طلب السحب مع تفاصيل الرسوم
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
    _fee_percentage,
    _fee_fixed,
    'pending'
  ) RETURNING id INTO _withdrawal_id;

  -- تسجيل رسوم السحب في platform_ledger
  IF _fee_amount > 0 THEN
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
      _fee_percentage,
      _fee_fixed,
      'DZD'
    );
  END IF;

  -- إعادة حساب الرصيد (سيخصم المبلغ المطلوب)
  PERFORM public.recalculate_user_balance(_user_id);

  RETURN json_build_object(
    'success', true,
    'message', 'تم إرسال طلب السحب بنجاح',
    'withdrawal_id', _withdrawal_id,
    'amount', _amount,
    'fee_amount', _fee_amount,
    'net_amount', _net_amount
  );
END;
$function$;

-- تحديث دالة recalculate_user_balance لتشمل رسوم السحب
CREATE OR REPLACE FUNCTION public.recalculate_user_balance(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _calculated_balance DECIMAL(10,2);
BEGIN
  SELECT COALESCE(
    (
      -- الإيداعات المعتمدة
      (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE user_id = _user_id AND status IN ('approved', 'completed'))
      -- بطاقات الهدايا المستخدمة
      + (SELECT COALESCE(SUM(amount), 0) FROM gift_cards WHERE used_by = _user_id AND is_used = true)
      -- التحويلات المستلمة
      + (SELECT COALESCE(SUM(amount), 0) FROM transfers WHERE recipient_id = _user_id AND status = 'completed')
      -- التحويلات المرسلة
      - (SELECT COALESCE(SUM(amount), 0) FROM transfers WHERE sender_id = _user_id AND status = 'completed')
      -- رسوم التحويل
      - (SELECT COALESCE(SUM(fee_amount), 0) FROM platform_ledger WHERE user_id = _user_id AND transaction_type = 'transfer_fee')
      -- رسوم الإيداع
      - (SELECT COALESCE(SUM(fee_amount), 0) FROM platform_ledger WHERE user_id = _user_id AND transaction_type = 'deposit_fee')
      -- السحوبات: المبلغ المطلوب فقط (الرسوم تُخصم من المبلغ المستلم)
      - (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed'))
      -- طلبات البطاقات الرقمية
      - (SELECT COALESCE(SUM(total_dzd), 0) FROM digital_card_orders WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed'))
      -- طلبات شحن الألعاب
      - (SELECT COALESCE(SUM(amount), 0) FROM game_topup_orders WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed'))
      -- طلبات شحن الهاتف مع رسومها
      - (
          SELECT COALESCE(SUM(p.amount), 0) + COALESCE(SUM(pl.fee_amount), 0)
          FROM phone_topup_orders p
          LEFT JOIN platform_ledger pl ON pl.transaction_id = p.id AND pl.transaction_type = 'phone_topup'
          WHERE p.user_id = _user_id AND p.status IN ('pending', 'approved', 'completed')
        )
      -- إيداعات المراهنات مع رسومها
      - (SELECT COALESCE(SUM(amount), 0) FROM betting_transactions WHERE user_id = _user_id AND transaction_type = 'deposit' AND status IN ('pending', 'approved', 'completed'))
      - (SELECT COALESCE(SUM(fee_amount), 0) FROM platform_ledger WHERE user_id = _user_id AND transaction_type = 'betting_deposit_fee')
    ),
    0
  ) INTO _calculated_balance;

  IF _calculated_balance < 0 THEN
    _calculated_balance := 0;
  END IF;

  INSERT INTO user_balances (user_id, balance, updated_at)
  VALUES (_user_id, _calculated_balance, now())
  ON CONFLICT (user_id)
  DO UPDATE SET balance = _calculated_balance, updated_at = now();
END;
$function$;