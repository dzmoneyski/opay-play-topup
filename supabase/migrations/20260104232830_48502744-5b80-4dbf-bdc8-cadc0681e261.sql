-- ======================================================
-- إصلاح شامل لجميع ثغرات السحب
-- ======================================================

-- 1. إضافة إعدادات الرسوم إذا لم تكن موجودة
INSERT INTO platform_settings (setting_key, setting_value, description)
VALUES ('withdrawal_fee', '{"percentage": 0, "fixed": 0}'::jsonb, 'رسوم السحب')
ON CONFLICT (setting_key) DO NOTHING;

-- 2. إنشاء جدول لتتبع أرقام الحسابات المستخدمة (لمنع استخدام نفس المحفظة في حسابين)
CREATE TABLE IF NOT EXISTS user_withdrawal_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL,
  withdrawal_method TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(account_number, withdrawal_method) -- نفس المحفظة لا يمكن ربطها بأكثر من مستخدم
);

-- تفعيل RLS
ALTER TABLE user_withdrawal_accounts ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "Users can view own accounts" ON user_withdrawal_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users cannot insert directly" ON user_withdrawal_accounts
  FOR INSERT TO authenticated WITH CHECK (false);

-- 3. تحديث دالة create_withdrawal الشاملة
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
  _daily_limit numeric := 10000; -- الحد اليومي 10,000 دج
  _min_amount numeric := 500;
  _max_amount numeric := 10000; -- الحد الأقصى للطلب الواحد = الحد اليومي
  _existing_account_user uuid;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- ====== التحقق 1: المبلغ ضمن الحدود ======
  IF _amount < _min_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأدنى للسحب هو ' || _min_amount || ' دج');
  END IF;

  IF _amount > _max_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأقصى للسحب هو ' || _max_amount || ' دج');
  END IF;

  IF _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'المبلغ يجب أن يكون أكبر من صفر');
  END IF;

  -- ====== التحقق 2: منع استخدام نفس المحفظة في حسابين مختلفين ======
  IF _account_number IS NOT NULL AND TRIM(_account_number) != '' THEN
    -- التحقق مما إذا كانت المحفظة مستخدمة من قبل مستخدم آخر
    SELECT user_id INTO _existing_account_user
    FROM user_withdrawal_accounts
    WHERE account_number = TRIM(_account_number)
      AND withdrawal_method = _withdrawal_method
      AND user_id != _user_id
    LIMIT 1;

    IF _existing_account_user IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'رقم الحساب/المحفظة مستخدم في حساب آخر. لا يمكن استخدام نفس المحفظة في أكثر من حساب.');
    END IF;

    -- التحقق من السجلات القديمة في جدول withdrawals
    SELECT user_id INTO _existing_account_user
    FROM withdrawals
    WHERE account_number = TRIM(_account_number)
      AND withdrawal_method = _withdrawal_method
      AND user_id != _user_id
      AND status IN ('pending', 'approved', 'completed')
    LIMIT 1;

    IF _existing_account_user IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'رقم الحساب/المحفظة مستخدم في حساب آخر. لا يمكن استخدام نفس المحفظة في أكثر من حساب.');
    END IF;
  END IF;

  -- ====== التحقق 3: قفل صف الرصيد لمنع race conditions ======
  SELECT balance INTO _current_balance
  FROM user_balances
  WHERE user_id = _user_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'لم يتم العثور على رصيدك');
  END IF;

  -- ====== التحقق 4: منع إنشاء طلب جديد إذا كان هناك طلب معلق ======
  SELECT COUNT(*) INTO _pending_count
  FROM withdrawals
  WHERE user_id = _user_id AND status = 'pending'
  FOR UPDATE;

  IF _pending_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'لديك طلب سحب معلق بالفعل. انتظر حتى تتم معالجته أو يتم رفضه.');
  END IF;

  -- ====== التحقق 5: الحد اليومي ======
  SELECT COALESCE(SUM(amount), 0) INTO _daily_total
  FROM withdrawals
  WHERE user_id = _user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day'
    AND status IN ('pending', 'approved', 'completed');

  IF (_daily_total + _amount) > _daily_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 
      'تجاوزت الحد اليومي للسحب (' || _daily_limit || ' دج). المتبقي لك اليوم: ' || (_daily_limit - _daily_total) || ' دج');
  END IF;

  -- ====== التحقق 6: جلب وحساب الرسوم ======
  SELECT 
    COALESCE((setting_value->>'percentage')::numeric, 0),
    COALESCE((setting_value->>'fixed')::numeric, 0)
  INTO _fee_percentage, _fee_fixed
  FROM platform_settings
  WHERE setting_key = 'withdrawal_fee';

  -- إذا لم توجد إعدادات، الرسوم = 0
  IF _fee_percentage IS NULL THEN _fee_percentage := 0; END IF;
  IF _fee_fixed IS NULL THEN _fee_fixed := 0; END IF;

  _fee_amount := (_amount * _fee_percentage / 100) + _fee_fixed;
  _net_amount := _amount; -- المبلغ الذي سيستلمه المستخدم = المبلغ المطلوب كاملاً
  _total_to_deduct := _amount + _fee_amount; -- المبلغ + الرسوم يُخصمان معاً

  -- ====== التحقق 7: كفاية الرصيد للمبلغ + الرسوم ======
  IF _current_balance < _total_to_deduct THEN
    RETURN jsonb_build_object('success', false, 'error', 
      'رصيدك غير كافٍ. تحتاج ' || _total_to_deduct || ' دج (المبلغ: ' || _amount || ' + الرسوم: ' || _fee_amount || '). رصيدك الحالي: ' || _current_balance || ' دج');
  END IF;

  -- ====== خصم المبلغ + الرسوم معاً ======
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

  -- ====== تسجيل رقم الحساب لمنع استخدامه من حسابات أخرى ======
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
    'net_amount', _net_amount,
    'total_deducted', _total_to_deduct
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'يرجى الانتظار ثم المحاولة مرة أخرى');
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'رقم الحساب/المحفظة مستخدم في حساب آخر');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'حدث خطأ: ' || SQLERRM);
END;
$$;

-- 4. تحديث trigger التحقق ليشمل نفس القيود
CREATE OR REPLACE FUNCTION validate_withdrawal_before_insert()
RETURNS TRIGGER AS $$
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
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. تحديث دالة رفض السحب لإرجاع المبلغ + الرسوم
CREATE OR REPLACE FUNCTION public.reject_withdrawal(
  _withdrawal_id uuid,
  _admin_id uuid,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _amount NUMERIC;
  _fee_amount NUMERIC;
  _total_to_return NUMERIC;
BEGIN
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can reject withdrawals';
  END IF;
  
  -- جلب معلومات السحب
  SELECT user_id, amount, COALESCE(fee_amount, 0) 
  INTO _user_id, _amount, _fee_amount
  FROM public.withdrawals
  WHERE id = _withdrawal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'طلب السحب غير موجود';
  END IF;

  _total_to_return := _amount + _fee_amount;
  
  -- رفض السحب
  UPDATE public.withdrawals 
  SET status = 'rejected',
      processed_at = now(),
      processed_by = _admin_id,
      admin_notes = _reason
  WHERE id = _withdrawal_id;

  -- إرجاع المبلغ + الرسوم للرصيد
  UPDATE user_balances
  SET balance = balance + _total_to_return,
      updated_at = now()
  WHERE user_id = _user_id;

  -- حذف سجل الرسوم من platform_ledger
  DELETE FROM public.platform_ledger
  WHERE transaction_id = _withdrawal_id AND transaction_type = 'withdrawal_fee';
END;
$$;

-- 6. تحديث triggers الحماية
CREATE OR REPLACE FUNCTION check_daily_withdrawal_count()
RETURNS TRIGGER AS $$
DECLARE
  _daily_count INTEGER;
  _max_daily_requests INTEGER := 5; -- 5 طلبات كحد أقصى يومياً
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