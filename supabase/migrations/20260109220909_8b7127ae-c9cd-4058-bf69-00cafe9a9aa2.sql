
-- Update the validate_withdrawal_before_insert function to allow admin_adjustment
CREATE OR REPLACE FUNCTION public.validate_withdrawal_before_insert()
RETURNS TRIGGER
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
  -- ====== Skip validation for admin adjustments ======
  IF NEW.withdrawal_method = 'admin_adjustment' THEN
    -- Admin adjustments bypass all validation - they are processed by admins directly
    RETURN NEW;
  END IF;

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
