
-- إصلاح دالة التحويل لاحتساب العمولة من الرصيد
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
  sender_balance_record RECORD;
  transfer_id UUID;
  sender_phone_record TEXT;
  _is_activated BOOLEAN;
  _current_balance NUMERIC;
  _transaction_number TEXT;
  _cleaned_phone TEXT;
  _fee_config JSONB;
  _fee_amount NUMERIC := 0;
  _total_deduction NUMERIC;
  _fee_percentage NUMERIC := 0;
  _fee_fixed NUMERIC := 0;
BEGIN
  -- Get current user
  sender_user_id := auth.uid();
  
  IF sender_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Check if sender account is activated
  SELECT is_account_activated INTO _is_activated
  FROM public.profiles
  WHERE user_id = sender_user_id;
  
  IF NOT COALESCE(_is_activated, false) THEN
    RETURN json_build_object('success', false, 'error', 'يجب تفعيل حسابك أولاً لإجراء التحويلات');
  END IF;

  -- INPUT VALIDATION
  IF amount_param IS NULL OR amount_param <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ غير صحيح');
  END IF;

  -- تنظيف رقم الهاتف (إزالة المسافات والرموز)
  _cleaned_phone := REGEXP_REPLACE(recipient_phone_param, '[^0-9+]', '', 'g');

  IF _cleaned_phone IS NULL OR _cleaned_phone !~ '^[0-9+]{10,15}$' THEN
    RETURN json_build_object('success', false, 'error', 'رقم الهاتف غير صحيح');
  END IF;

  IF note_param IS NOT NULL AND LENGTH(note_param) > 500 THEN
    RETURN json_build_object('success', false, 'error', 'الملاحظة طويلة جداً');
  END IF;

  -- جلب إعدادات العمولة
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'transfer_fees';

  -- حساب العمولة إذا كانت مفعلة
  IF _fee_config IS NOT NULL AND (_fee_config->>'enabled')::boolean = true THEN
    _fee_percentage := COALESCE((_fee_config->>'percentage')::numeric, 0);
    _fee_fixed := COALESCE((_fee_config->>'fixed_amount')::numeric, 0);
    
    -- حساب العمولة: نسبة مئوية + مبلغ ثابت
    _fee_amount := (amount_param * _fee_percentage / 100) + _fee_fixed;
    
    -- تطبيق الحد الأدنى والأقصى
    _fee_amount := GREATEST(_fee_amount, COALESCE((_fee_config->>'min_fee')::numeric, 0));
    _fee_amount := LEAST(_fee_amount, COALESCE((_fee_config->>'max_fee')::numeric, 999999));
    
    -- تقريب العمولة لأقرب رقمين عشريين
    _fee_amount := ROUND(_fee_amount, 2);
  END IF;

  -- المبلغ الإجمالي للخصم = المبلغ + العمولة
  _total_deduction := amount_param + _fee_amount;

  -- Find recipient by phone
  SELECT user_id INTO recipient_user_id
  FROM public.profiles
  WHERE phone = _cleaned_phone;

  IF recipient_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'رقم الهاتف غير مسجل في النظام');
  END IF;

  -- Cannot transfer to yourself
  IF sender_user_id = recipient_user_id THEN
    RETURN json_build_object('success', false, 'error', 'لا يمكن التحويل إلى نفسك');
  END IF;

  -- Get sender phone
  SELECT phone INTO sender_phone_record
  FROM public.profiles
  WHERE user_id = sender_user_id;

  -- Get sender balance with lock
  SELECT * INTO sender_balance_record
  FROM public.user_balances
  WHERE user_id = sender_user_id
  FOR UPDATE;

  IF sender_balance_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'لم يتم العثور على رصيدك');
  END IF;

  -- التحقق من الرصيد الكافي (المبلغ + العمولة)
  IF sender_balance_record.balance < _total_deduction THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'الرصيد غير كافي. تحتاج ' || _total_deduction || ' دج (المبلغ: ' || amount_param || ' + العمولة: ' || _fee_amount || ' دج)'
    );
  END IF;

  -- Generate transaction number
  _transaction_number := public.generate_transfer_transaction_number();

  -- Create transfer record
  INSERT INTO public.transfers (
    sender_id, recipient_id, sender_phone, recipient_phone, amount, note, status, transaction_number
  ) VALUES (
    sender_user_id, recipient_user_id, sender_phone_record, _cleaned_phone, amount_param, note_param, 'completed', _transaction_number
  ) RETURNING id INTO transfer_id;

  -- خصم المبلغ + العمولة من المرسل
  UPDATE public.user_balances
  SET balance = balance - _total_deduction, updated_at = now()
  WHERE user_id = sender_user_id;

  -- إضافة المبلغ للمستلم (بدون العمولة)
  INSERT INTO public.user_balances (user_id, balance)
  VALUES (recipient_user_id, amount_param)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_balances.balance + amount_param, updated_at = now();

  -- تسجيل العمولة في platform_ledger
  IF _fee_amount > 0 THEN
    INSERT INTO public.platform_ledger (
      user_id, transaction_type, transaction_id, original_amount, 
      fee_amount, fee_percentage, fee_fixed, currency
    ) VALUES (
      sender_user_id, 'transfer', transfer_id, amount_param,
      _fee_amount, _fee_percentage, _fee_fixed, 'DZD'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'transfer_id', transfer_id,
    'recipient_id', recipient_user_id,
    'transaction_number', _transaction_number,
    'fee_amount', _fee_amount,
    'total_deducted', _total_deduction
  );

EXCEPTION
  WHEN check_violation THEN
    RETURN json_build_object('success', false, 'error', 'الرصيد غير كافي للتحويل');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'حدث خطأ أثناء التحويل، يرجى المحاولة مرة أخرى');
END;
$$;
