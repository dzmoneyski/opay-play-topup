-- ====== إصلاح الثغرات الأمنية (بدون كسر البيانات القديمة) ======

-- 1. منع المستخدمين من حذف رصيدهم
DROP POLICY IF EXISTS "Users cannot delete balances" ON user_balances;
CREATE POLICY "Users cannot delete balances" ON user_balances
FOR DELETE USING (false);

-- 2. منع المستخدمين العاديين من تحديث رصيدهم مباشرة (فقط الـ admin والـ functions)
DROP POLICY IF EXISTS "Users cannot update balances directly" ON user_balances;
CREATE POLICY "Users cannot update balances directly" ON user_balances
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- 3. منع حذف السحوبات نهائياً
DROP POLICY IF EXISTS "Nobody can delete withdrawals" ON withdrawals;
CREATE POLICY "Nobody can delete withdrawals" ON withdrawals
FOR DELETE USING (false);

-- 4. تحديث الدالة لتتحقق من كل شيء
CREATE OR REPLACE FUNCTION public.create_withdrawal(
  _amount numeric,
  _withdrawal_method text,
  _account_number text DEFAULT NULL,
  _account_holder_name text DEFAULT NULL,
  _cash_location text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _current_balance numeric;
  _withdrawal_id uuid;
  _fee_percentage numeric := 0;
  _fee_fixed numeric := 0;
  _fee_amount numeric := 0;
  _net_amount numeric;
  _total_to_deduct numeric;
  _pending_count integer;
  _daily_total numeric;
  _daily_limit numeric := 10000;
  _min_amount numeric := 500;
  _max_amount numeric := 10000;
  _existing_account_user uuid;
  _valid_methods text[] := ARRAY['opay', 'barid_bank', 'ccp', 'albaraka', 'badr', 'cash'];
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- ====== التحقق 0: طريقة السحب صالحة ======
  IF _withdrawal_method IS NULL OR NOT (_withdrawal_method = ANY(_valid_methods)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'طريقة سحب غير صالحة');
  END IF;

  -- ====== التحقق 1: المبلغ ضمن الحدود ======
  -- تقريب المبلغ لخانتين عشريتين لمنع التلاعب
  _amount := ROUND(_amount, 2);
  
  IF _amount < _min_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأدنى للسحب هو ' || _min_amount || ' دج');
  END IF;

  IF _amount > _max_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأقصى للسحب هو ' || _max_amount || ' دج');
  END IF;

  IF _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'المبلغ يجب أن يكون أكبر من صفر');
  END IF;

  -- ====== التحقق 2: التحقق من الحقول المطلوبة حسب الطريقة ======
  IF _withdrawal_method IN ('opay', 'barid_bank', 'ccp', 'albaraka', 'badr') THEN
    IF _account_number IS NULL OR TRIM(_account_number) = '' THEN
      RETURN jsonb_build_object('success', false, 'error', 'رقم الحساب مطلوب');
    END IF;
    IF _account_holder_name IS NULL OR TRIM(_account_holder_name) = '' THEN
      RETURN jsonb_build_object('success', false, 'error', 'اسم صاحب الحساب مطلوب');
    END IF;
  END IF;

  IF _withdrawal_method = 'cash' THEN
    IF _cash_location IS NULL OR TRIM(_cash_location) = '' THEN
      RETURN jsonb_build_object('success', false, 'error', 'موقع استلام الكاش مطلوب');
    END IF;
    -- للسحب النقدي يجب أن يكون المبلغ زوجياً
    IF (_amount::integer % 2) != 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'يجب أن يكون المبلغ عددًا زوجيًا للسحب النقدي');
    END IF;
  END IF;

  -- ====== التحقق 3: منع استخدام نفس المحفظة في حسابين مختلفين ======
  IF _account_number IS NOT NULL AND TRIM(_account_number) != '' THEN
    SELECT user_id INTO _existing_account_user
    FROM user_withdrawal_accounts
    WHERE account_number = TRIM(_account_number)
      AND withdrawal_method = _withdrawal_method
      AND user_id != _user_id
    LIMIT 1;

    IF _existing_account_user IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'رقم الحساب/المحفظة مستخدم في حساب آخر');
    END IF;

    SELECT user_id INTO _existing_account_user
    FROM withdrawals
    WHERE account_number = TRIM(_account_number)
      AND withdrawal_method = _withdrawal_method
      AND user_id != _user_id
      AND status IN ('pending', 'approved', 'completed')
    LIMIT 1;

    IF _existing_account_user IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'رقم الحساب/المحفظة مستخدم في حساب آخر');
    END IF;
  END IF;

  -- ====== التحقق 4: قفل صف الرصيد لمنع race conditions ======
  SELECT balance INTO _current_balance
  FROM user_balances
  WHERE user_id = _user_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'لم يتم العثور على رصيدك');
  END IF;

  -- ====== التحقق 5: منع إنشاء طلب جديد إذا كان هناك طلب معلق ======
  SELECT COUNT(*) INTO _pending_count
  FROM withdrawals
  WHERE user_id = _user_id AND status = 'pending'
  FOR UPDATE;

  IF _pending_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'لديك طلب سحب معلق بالفعل');
  END IF;

  -- ====== التحقق 6: الحد اليومي (بعد التقريب) ======
  SELECT COALESCE(SUM(ROUND(amount, 2)), 0) INTO _daily_total
  FROM withdrawals
  WHERE user_id = _user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day'
    AND status IN ('pending', 'approved', 'completed');

  IF (_daily_total + _amount) > _daily_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 
      'تجاوزت الحد اليومي للسحب. المتبقي: ' || GREATEST(0, _daily_limit - _daily_total) || ' دج');
  END IF;

  -- ====== التحقق 7: جلب وحساب الرسوم ======
  SELECT 
    COALESCE((setting_value->>'percentage')::numeric, 0),
    COALESCE((setting_value->>'fixed')::numeric, 0)
  INTO _fee_percentage, _fee_fixed
  FROM platform_settings
  WHERE setting_key = 'withdrawal_fee';

  IF _fee_percentage IS NULL THEN _fee_percentage := 0; END IF;
  IF _fee_fixed IS NULL THEN _fee_fixed := 0; END IF;

  _fee_amount := ROUND((_amount * _fee_percentage / 100) + _fee_fixed, 2);
  _net_amount := _amount;
  _total_to_deduct := _amount + _fee_amount;

  -- ====== التحقق 8: كفاية الرصيد ======
  IF _current_balance < _total_to_deduct THEN
    RETURN jsonb_build_object('success', false, 'error', 
      'رصيدك غير كافٍ. تحتاج ' || _total_to_deduct || ' دج');
  END IF;

  -- ====== خصم المبلغ + الرسوم ======
  UPDATE user_balances
  SET balance = balance - _total_to_deduct,
      updated_at = now()
  WHERE user_id = _user_id;

  -- ====== إنشاء طلب السحب ======
  INSERT INTO withdrawals (
    user_id, amount, fee_amount, net_amount, fee_percentage, fee_fixed,
    withdrawal_method, account_number, account_holder_name, cash_location, notes, status
  ) VALUES (
    _user_id, _amount, _fee_amount, _net_amount, _fee_percentage, _fee_fixed,
    _withdrawal_method, TRIM(_account_number), _account_holder_name, _cash_location, _notes, 'pending'
  )
  RETURNING id INTO _withdrawal_id;

  -- ====== تسجيل رقم الحساب ======
  IF _account_number IS NOT NULL AND TRIM(_account_number) != '' THEN
    INSERT INTO user_withdrawal_accounts (user_id, account_number, withdrawal_method)
    VALUES (_user_id, TRIM(_account_number), _withdrawal_method)
    ON CONFLICT (account_number, withdrawal_method) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', _withdrawal_id,
    'amount', _amount,
    'fee_amount', _fee_amount,
    'total_deducted', _total_to_deduct
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'يرجى الانتظار ثم المحاولة مرة أخرى');
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'رقم الحساب مستخدم في حساب آخر');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'حدث خطأ غير متوقع');
END;
$$;

-- 5. تحديث الـ trigger للتحقق من طريقة السحب
CREATE OR REPLACE FUNCTION public.validate_withdrawal_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_balance DECIMAL(10,2);
  _pending_count INTEGER;
  _daily_total NUMERIC;
  _daily_limit NUMERIC := 10000;
  _min_amount NUMERIC := 500;
  _max_amount NUMERIC := 10000;
  _existing_account_user UUID;
  _fee_amount NUMERIC;
  _total_to_deduct NUMERIC;
  _valid_methods text[] := ARRAY['opay', 'barid_bank', 'ccp', 'albaraka', 'badr', 'cash'];
BEGIN
  -- ====== التحقق 0: طريقة السحب صالحة ======
  IF NEW.withdrawal_method IS NULL OR NOT (NEW.withdrawal_method = ANY(_valid_methods)) THEN
    RAISE EXCEPTION 'طريقة سحب غير صالحة: %', COALESCE(NEW.withdrawal_method, 'NULL');
  END IF;

  -- ====== التحقق 1: المبلغ ضمن الحدود ======
  IF NEW.amount IS NULL OR NEW.amount < _min_amount OR NEW.amount > _max_amount THEN
    RAISE EXCEPTION 'المبلغ يجب أن يكون بين % و % دج', _min_amount, _max_amount;
  END IF;

  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'المبلغ يجب أن يكون أكبر من صفر';
  END IF;

  -- ====== التحقق 2: طريقة السحب مطلوبة ======
  IF NEW.withdrawal_method IS NULL OR TRIM(NEW.withdrawal_method) = '' THEN
    RAISE EXCEPTION 'طريقة السحب مطلوبة';
  END IF;

  -- ====== التحقق 3: منع استخدام نفس المحفظة في حسابين ======
  IF NEW.account_number IS NOT NULL AND TRIM(NEW.account_number) != '' THEN
    SELECT user_id INTO _existing_account_user
    FROM withdrawals
    WHERE account_number = TRIM(NEW.account_number)
      AND withdrawal_method = NEW.withdrawal_method
      AND user_id != NEW.user_id
      AND status IN ('pending', 'approved', 'completed')
    LIMIT 1;

    IF _existing_account_user IS NOT NULL THEN
      RAISE EXCEPTION 'رقم الحساب/المحفظة مستخدم في حساب آخر';
    END IF;
  END IF;

  -- ====== التحقق 4: التحقق من عدم وجود طلب معلق ======
  SELECT COUNT(*) INTO _pending_count
  FROM withdrawals
  WHERE user_id = NEW.user_id 
    AND status = 'pending'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF _pending_count > 0 THEN
    RAISE EXCEPTION 'لديك طلب سحب معلق بالفعل. انتظر حتى تتم معالجته.';
  END IF;

  -- ====== التحقق 5: الحد اليومي ======
  SELECT COALESCE(SUM(amount), 0) INTO _daily_total
  FROM withdrawals
  WHERE user_id = NEW.user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day'
    AND status IN ('pending', 'approved', 'completed')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF (_daily_total + NEW.amount) > _daily_limit THEN
    RAISE EXCEPTION 'تجاوزت الحد اليومي للسحب (% دج)', _daily_limit;
  END IF;

  -- ====== التحقق 6: الحقول حسب طريقة السحب ======
  IF NEW.withdrawal_method IN ('opay', 'barid_bank', 'ccp', 'albaraka', 'badr') THEN
    IF NEW.account_number IS NULL OR TRIM(NEW.account_number) = '' THEN
      RAISE EXCEPTION 'رقم الحساب مطلوب لهذه الطريقة';
    END IF;
    IF NEW.account_holder_name IS NULL OR TRIM(NEW.account_holder_name) = '' THEN
      RAISE EXCEPTION 'اسم صاحب الحساب مطلوب';
    END IF;
  END IF;

  IF NEW.withdrawal_method = 'cash' THEN
    IF NEW.cash_location IS NULL OR TRIM(NEW.cash_location) = '' THEN
      RAISE EXCEPTION 'موقع استلام الكاش مطلوب';
    END IF;
  END IF;

  -- ====== التحقق 7: الرصيد الكافي للمبلغ + الرسوم ======
  _fee_amount := COALESCE(NEW.fee_amount, 0);
  _total_to_deduct := NEW.amount + _fee_amount;

  SELECT balance INTO _current_balance
  FROM user_balances
  WHERE user_id = NEW.user_id
  FOR UPDATE;

  IF COALESCE(_current_balance, 0.00) < _total_to_deduct THEN
    RAISE EXCEPTION 'رصيدك غير كافٍ. تحتاج % دج (المبلغ + الرسوم)', _total_to_deduct;
  END IF;

  RETURN NEW;
END;
$$;