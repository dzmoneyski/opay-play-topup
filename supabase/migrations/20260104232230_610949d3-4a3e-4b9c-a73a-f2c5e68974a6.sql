-- ======================================================
-- إصلاح شامل لثغرات السحب
-- ======================================================

-- 1. إزالة سياسة INSERT للمستخدمين (يجب استخدام الدالة فقط)
DROP POLICY IF EXISTS "Users can create their own withdrawals" ON withdrawals;

-- 2. إنشاء سياسة جديدة تمنع INSERT المباشر من المستخدمين
-- المستخدمون يمكنهم فقط SELECT، والدالة SECURITY DEFINER تتولى INSERT
CREATE POLICY "Users cannot insert withdrawals directly"
ON withdrawals
FOR INSERT
TO authenticated
WITH CHECK (false); -- منع INSERT مباشر نهائياً

-- 3. الإبقاء على سياسة Admin للـ INSERT
-- (موجودة مسبقاً: Admins can insert withdrawals)

-- 4. تحديث trigger التحقق ليشمل جميع الفحوصات
CREATE OR REPLACE FUNCTION validate_withdrawal_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  _current_balance DECIMAL(10,2);
  _pending_count INTEGER;
  _daily_total NUMERIC;
  _daily_limit NUMERIC := 500000;
  _min_amount NUMERIC := 500;
  _max_amount NUMERIC := 200000;
BEGIN
  -- ====== التحقق 1: المبلغ ضمن الحدود ======
  IF NEW.amount IS NULL OR NEW.amount < _min_amount OR NEW.amount > _max_amount THEN
    RAISE EXCEPTION 'المبلغ يجب أن يكون بين % و % دج', _min_amount, _max_amount;
  END IF;

  -- ====== التحقق 2: منع المبالغ السالبة ======
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'المبلغ يجب أن يكون أكبر من صفر';
  END IF;

  -- ====== التحقق 3: طريقة السحب مطلوبة ======
  IF NEW.withdrawal_method IS NULL OR TRIM(NEW.withdrawal_method) = '' THEN
    RAISE EXCEPTION 'طريقة السحب مطلوبة';
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
    RAISE EXCEPTION 'تجاوزت الحد اليومي للسحب (% دج). المسحوب اليوم: % دج', _daily_limit, _daily_total;
  END IF;

  -- ====== التحقق 6: الحقول حسب طريقة السحب ======
  IF NEW.withdrawal_method IN ('barid_bank', 'ccp', 'albaraka', 'badr') THEN
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

  -- ====== التحقق 7: الرصيد الكافي مع قفل الصف ======
  SELECT balance INTO _current_balance
  FROM user_balances
  WHERE user_id = NEW.user_id
  FOR UPDATE;

  IF COALESCE(_current_balance, 0.00) < NEW.amount THEN
    RAISE EXCEPTION 'رصيدك غير كافٍ. الرصيد الحالي: % دج', COALESCE(_current_balance, 0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. تحديث دالة create_withdrawal لتكون الطريقة الوحيدة للسحب
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
  _pending_count integer;
  _daily_total numeric;
  _daily_limit numeric := 500000;
  _min_amount numeric := 500;
  _max_amount numeric := 200000;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- التحقق من المبلغ
  IF _amount < _min_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأدنى للسحب هو ' || _min_amount || ' دج');
  END IF;

  IF _amount > _max_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأقصى للسحب هو ' || _max_amount || ' دج');
  END IF;

  IF _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'المبلغ يجب أن يكون أكبر من صفر');
  END IF;

  -- قفل صف الرصيد أولاً لمنع race conditions
  SELECT balance INTO _current_balance
  FROM user_balances
  WHERE user_id = _user_id
  FOR UPDATE NOWAIT; -- NOWAIT لمنع الانتظار في حالة محاولات متزامنة

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'لم يتم العثور على رصيدك');
  END IF;

  -- التحقق من طلب معلق (بعد القفل)
  SELECT COUNT(*) INTO _pending_count
  FROM withdrawals
  WHERE user_id = _user_id AND status = 'pending'
  FOR UPDATE; -- قفل الطلبات المعلقة أيضاً

  IF _pending_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'لديك طلب سحب معلق بالفعل');
  END IF;

  -- التحقق من الحد اليومي
  SELECT COALESCE(SUM(amount), 0) INTO _daily_total
  FROM withdrawals
  WHERE user_id = _user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day'
    AND status IN ('pending', 'approved', 'completed');

  IF (_daily_total + _amount) > _daily_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 'تجاوزت الحد اليومي للسحب (' || _daily_limit || ' دج). المسحوب اليوم: ' || _daily_total || ' دج');
  END IF;

  -- جلب الرسوم
  SELECT 
    COALESCE((setting_value->>'percentage')::numeric, 0),
    COALESCE((setting_value->>'fixed')::numeric, 0)
  INTO _fee_percentage, _fee_fixed
  FROM platform_settings
  WHERE setting_key = 'withdrawal_fee';

  _fee_amount := (_amount * _fee_percentage / 100) + _fee_fixed;
  _net_amount := _amount - _fee_amount;

  -- التحقق من الرصيد
  IF _current_balance < _amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيدك غير كافٍ. الرصيد الحالي: ' || _current_balance || ' دج');
  END IF;

  -- خصم المبلغ
  UPDATE user_balances
  SET balance = balance - _amount,
      updated_at = now()
  WHERE user_id = _user_id;

  -- إنشاء طلب السحب
  INSERT INTO withdrawals (
    user_id, amount, fee_amount, net_amount, fee_percentage, fee_fixed,
    withdrawal_method, account_number, account_holder_name, cash_location, notes, status
  ) VALUES (
    _user_id, _amount, _fee_amount, _net_amount, _fee_percentage, _fee_fixed,
    _withdrawal_method, _account_number, _account_holder_name, _cash_location, _notes, 'pending'
  )
  RETURNING id INTO _withdrawal_id;

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', _withdrawal_id,
    'amount', _amount,
    'fee_amount', _fee_amount,
    'net_amount', _net_amount
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'يرجى الانتظار ثم المحاولة مرة أخرى');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'حدث خطأ: ' || SQLERRM);
END;
$$;

-- 6. إضافة حد أقصى لعدد الطلبات اليومية (10 طلبات كحد أقصى)
CREATE OR REPLACE FUNCTION check_daily_withdrawal_count()
RETURNS TRIGGER AS $$
DECLARE
  _daily_count INTEGER;
  _max_daily_requests INTEGER := 10;
BEGIN
  SELECT COUNT(*) INTO _daily_count
  FROM withdrawals
  WHERE user_id = NEW.user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  IF _daily_count >= _max_daily_requests THEN
    RAISE EXCEPTION 'تجاوزت الحد الأقصى لعدد طلبات السحب اليومية (% طلبات)', _max_daily_requests;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- إنشاء trigger لفحص عدد الطلبات
DROP TRIGGER IF EXISTS trg_check_daily_withdrawal_count ON withdrawals;
CREATE TRIGGER trg_check_daily_withdrawal_count
  BEFORE INSERT ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION check_daily_withdrawal_count();

-- 7. إضافة cooldown بين الطلبات (5 دقائق)
CREATE OR REPLACE FUNCTION check_withdrawal_cooldown()
RETURNS TRIGGER AS $$
DECLARE
  _last_withdrawal_time TIMESTAMP WITH TIME ZONE;
  _cooldown_minutes INTEGER := 5;
BEGIN
  SELECT created_at INTO _last_withdrawal_time
  FROM withdrawals
  WHERE user_id = NEW.user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF _last_withdrawal_time IS NOT NULL 
     AND (NOW() - _last_withdrawal_time) < (_cooldown_minutes || ' minutes')::INTERVAL THEN
    RAISE EXCEPTION 'يجب الانتظار % دقائق بين كل طلب سحب', _cooldown_minutes;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_withdrawal_cooldown ON withdrawals;
CREATE TRIGGER trg_check_withdrawal_cooldown
  BEFORE INSERT ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION check_withdrawal_cooldown();