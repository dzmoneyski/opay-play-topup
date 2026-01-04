-- حذف الدالة القديمة أولاً
DROP FUNCTION IF EXISTS public.create_withdrawal(numeric, text, text, text, text, text);

-- إنشاء دالة السحب المحسّنة مع جميع الحمايات الأمنية
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
  -- الحصول على معرف المستخدم الحالي
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- ====== التحقق 1: الحد الأدنى والأقصى للمبلغ ======
  IF _amount < _min_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأدنى للسحب هو ' || _min_amount || ' دج');
  END IF;

  IF _amount > _max_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأقصى للسحب هو ' || _max_amount || ' دج');
  END IF;

  -- ====== التحقق 2: منع المبالغ السالبة أو الصفرية ======
  IF _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'المبلغ يجب أن يكون أكبر من صفر');
  END IF;

  -- ====== التحقق 3: التحقق من عدم وجود طلب سحب معلق ======
  SELECT COUNT(*) INTO _pending_count
  FROM withdrawals
  WHERE user_id = _user_id AND status = 'pending';

  IF _pending_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'لديك طلب سحب معلق بالفعل');
  END IF;

  -- ====== التحقق 4: الحد اليومي ======
  SELECT COALESCE(SUM(amount), 0) INTO _daily_total
  FROM withdrawals
  WHERE user_id = _user_id
    AND created_at >= CURRENT_DATE
    AND status IN ('pending', 'approved');

  IF (_daily_total + _amount) > _daily_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 'تجاوزت الحد اليومي للسحب (' || _daily_limit || ' دج)');
  END IF;

  -- ====== التحقق 5: جلب الرسوم من الإعدادات ======
  SELECT 
    COALESCE((setting_value->>'percentage')::numeric, 0),
    COALESCE((setting_value->>'fixed')::numeric, 0)
  INTO _fee_percentage, _fee_fixed
  FROM platform_settings
  WHERE setting_key = 'withdrawal_fee';

  -- حساب الرسوم
  _fee_amount := (_amount * _fee_percentage / 100) + _fee_fixed;
  _net_amount := _amount - _fee_amount;

  -- ====== التحقق 6: الرصيد مع FOR UPDATE لمنع race conditions ======
  SELECT balance INTO _current_balance
  FROM user_balances
  WHERE user_id = _user_id
  FOR UPDATE; -- قفل الصف لمنع التعديل المتزامن

  IF _current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'لم يتم العثور على رصيدك');
  END IF;

  IF _current_balance < _amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيدك غير كافٍ. الرصيد الحالي: ' || _current_balance || ' دج');
  END IF;

  -- ====== خصم المبلغ فوراً ======
  UPDATE user_balances
  SET balance = balance - _amount,
      updated_at = now()
  WHERE user_id = _user_id;

  -- ====== إنشاء طلب السحب ======
  INSERT INTO withdrawals (
    user_id,
    amount,
    fee_amount,
    net_amount,
    fee_percentage,
    fee_fixed,
    withdrawal_method,
    account_number,
    account_holder_name,
    cash_location,
    notes,
    status
  ) VALUES (
    _user_id,
    _amount,
    _fee_amount,
    _net_amount,
    _fee_percentage,
    _fee_fixed,
    _withdrawal_method,
    _account_number,
    _account_holder_name,
    _cash_location,
    _notes,
    'pending'
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
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'حدث خطأ: ' || SQLERRM);
END;
$$;

-- ====== إضافة CHECK constraints لمنع المبالغ السالبة ======
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'withdrawals_amount_positive'
  ) THEN
    ALTER TABLE withdrawals ADD CONSTRAINT withdrawals_amount_positive CHECK (amount > 0);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'withdrawals_fee_non_negative'
  ) THEN
    ALTER TABLE withdrawals ADD CONSTRAINT withdrawals_fee_non_negative CHECK (fee_amount >= 0);
  END IF;
END $$;