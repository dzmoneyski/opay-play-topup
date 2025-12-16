-- 1. قبول طلب السحب الحالي لزوكاني أسامة
UPDATE public.withdrawals 
SET status = 'completed',
    processed_at = now(),
    admin_notes = 'تم إرسال 3000 دج للمستخدم - الرسوم 80 دج'
WHERE id = '60c57ae3-bc12-4b6a-b9a2-e85be481fc2f';

-- 2. إضافة حقول الرسوم لجدول السحب
ALTER TABLE public.withdrawals 
ADD COLUMN IF NOT EXISTS fee_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fee_percentage NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fee_fixed NUMERIC DEFAULT 0;

-- 3. تحديث دالة إنشاء السحب لحفظ الرسوم بشكل منفصل
CREATE OR REPLACE FUNCTION public.create_withdrawal(
  _amount NUMERIC,
  _withdrawal_method TEXT,
  _account_number TEXT DEFAULT NULL,
  _account_holder_name TEXT DEFAULT NULL,
  _cash_location TEXT DEFAULT NULL,
  _notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _current_balance DECIMAL(10,2);
  _fee_config JSONB;
  _fee_info JSONB;
  _fee_amount DECIMAL(10,2);
  _total_deducted DECIMAL(10,2);
  _new_withdrawal_id UUID;
  _fee_percentage DECIMAL(10,4);
  _fee_fixed DECIMAL(10,2);
BEGIN
  -- Get current user
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'يجب تسجيل الدخول أولاً');
  END IF;
  
  -- Validate amount
  IF _amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ يجب أن يكون أكبر من صفر');
  END IF;
  
  -- CRITICAL: إعادة حساب الرصيد قبل التحقق لضمان دقته
  PERFORM public.recalculate_user_balance(_user_id);
  
  -- Get current user balance
  SELECT COALESCE(balance, 0) INTO _current_balance
  FROM public.user_balances
  WHERE user_id = _user_id;
  
  -- Get withdrawal fee configuration
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'withdrawal_fees';
  
  -- Calculate fees
  _fee_info := public.calculate_fee(_amount, _fee_config);
  _fee_amount := COALESCE((_fee_info->>'fee_amount')::NUMERIC, 0);
  _fee_percentage := COALESCE((_fee_info->>'fee_percentage')::NUMERIC, 0);
  _fee_fixed := COALESCE((_fee_info->>'fee_fixed')::NUMERIC, 0);
  _total_deducted := _amount + _fee_amount;
  
  -- CRITICAL: Check if user has sufficient balance (including fees)
  IF _current_balance < _total_deducted THEN
    RETURN json_build_object(
      'success', false, 
      'error', format('رصيدك غير كافي للسحب. الرصيد الحالي: %s دج، المطلوب: %s دج (المبلغ: %s + الرسوم: %s)', 
        _current_balance, _total_deducted, _amount, _fee_amount)
    );
  END IF;
  
  -- Create withdrawal request - حفظ المبلغ المطلوب والرسوم بشكل منفصل
  INSERT INTO public.withdrawals (
    user_id,
    amount,           -- المبلغ الذي سيُرسل للمستخدم (الصافي)
    fee_amount,       -- مبلغ الرسوم
    net_amount,       -- نفس amount (للتوضيح)
    fee_percentage,   -- نسبة الرسوم
    fee_fixed,        -- الرسوم الثابتة
    withdrawal_method,
    account_number,
    account_holder_name,
    cash_location,
    notes,
    status
  ) VALUES (
    _user_id,
    _amount,          -- المبلغ الصافي للإرسال
    _fee_amount,
    _amount,          -- net_amount = amount
    _fee_percentage,
    _fee_fixed,
    _withdrawal_method,
    _account_number,
    _account_holder_name,
    _cash_location,
    _notes,
    'pending'
  )
  RETURNING id INTO _new_withdrawal_id;
  
  RETURN json_build_object(
    'success', true, 
    'withdrawal_id', _new_withdrawal_id,
    'amount', _amount,
    'fee_amount', _fee_amount,
    'total_deducted', _total_deducted,
    'message', format('تم إنشاء طلب السحب. سيتم خصم %s دج من رصيدك (%s دج + %s دج رسوم)', _total_deducted, _amount, _fee_amount)
  );
END;
$$;

-- 4. تحديث دالة recalculate_user_balance لاحتساب الرسوم بشكل صحيح
CREATE OR REPLACE FUNCTION public.recalculate_user_balance(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _calculated_balance DECIMAL(10,2);
BEGIN
  -- حساب الرصيد من جميع المعاملات
  SELECT COALESCE(
    (
      -- الإيداعات المعتمدة
      (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE user_id = _user_id AND status IN ('approved', 'completed'))
      -- + بطاقات الهدايا المستخدمة
      + (SELECT COALESCE(SUM(amount), 0) FROM gift_cards WHERE used_by = _user_id AND is_used = true)
      -- + التحويلات الواردة
      + (SELECT COALESCE(SUM(amount), 0) FROM transfers WHERE recipient_id = _user_id AND status = 'completed')
      -- - التحويلات الصادرة
      - (SELECT COALESCE(SUM(amount), 0) FROM transfers WHERE sender_id = _user_id AND status = 'completed')
      -- - السحوبات (المبلغ + الرسوم) للحالات pending, approved, completed
      - (SELECT COALESCE(SUM(amount + COALESCE(fee_amount, 0)), 0) FROM withdrawals WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed'))
      -- - طلبات البطاقات الرقمية
      - (SELECT COALESCE(SUM(total_dzd), 0) FROM digital_card_orders WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed'))
      -- - طلبات شحن الألعاب
      - (SELECT COALESCE(SUM(amount), 0) FROM game_topup_orders WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed'))
      -- - معاملات المراهنات
      - (SELECT COALESCE(SUM(amount), 0) FROM betting_transactions WHERE user_id = _user_id AND transaction_type = 'deposit' AND status IN ('pending', 'approved', 'completed'))
    ), 0
  ) INTO _calculated_balance;
  
  -- تحديث أو إدراج الرصيد
  INSERT INTO user_balances (user_id, balance, updated_at)
  VALUES (_user_id, _calculated_balance, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET balance = _calculated_balance, updated_at = now();
END;
$$;