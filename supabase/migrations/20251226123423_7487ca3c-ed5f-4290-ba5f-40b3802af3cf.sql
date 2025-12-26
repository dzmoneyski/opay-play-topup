-- إصلاح دالة recalculate_user_balance لضمان عدم الرصيد السالب
CREATE OR REPLACE FUNCTION public.recalculate_user_balance(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      -- - عمولات التحويلات من platform_ledger
      - (SELECT COALESCE(SUM(fee_amount), 0) FROM platform_ledger WHERE user_id = _user_id AND transaction_type = 'transfer_fee')
      -- - رسوم الإيداع من platform_ledger
      - (SELECT COALESCE(SUM(fee_amount), 0) FROM platform_ledger WHERE user_id = _user_id AND transaction_type = 'deposit_fee')
      -- - السحوبات (المبلغ + الرسوم) للحالات pending, approved, completed
      - (SELECT COALESCE(SUM(amount + COALESCE(fee_amount, 0)), 0) FROM withdrawals WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed'))
      -- - طلبات البطاقات الرقمية
      - (SELECT COALESCE(SUM(total_dzd), 0) FROM digital_card_orders WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed'))
      -- - طلبات شحن الألعاب
      - (SELECT COALESCE(SUM(amount), 0) FROM game_topup_orders WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed'))
      -- - معاملات المراهنات (الإيداعات)
      - (SELECT COALESCE(SUM(amount), 0) FROM betting_transactions WHERE user_id = _user_id AND transaction_type = 'deposit' AND status IN ('pending', 'approved', 'completed'))
      -- - عمولات إيداعات المراهنات
      - (SELECT COALESCE(SUM(fee_amount), 0) FROM platform_ledger WHERE user_id = _user_id AND transaction_type = 'betting_deposit_fee')
    ), 0
  ) INTO _calculated_balance;
  
  -- ضمان عدم الرصيد السالب (حماية إضافية)
  IF _calculated_balance < 0 THEN
    _calculated_balance := 0;
  END IF;
  
  -- تحديث أو إدراج الرصيد
  INSERT INTO user_balances (user_id, balance, updated_at)
  VALUES (_user_id, _calculated_balance, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET balance = _calculated_balance, updated_at = now();
END;
$function$;

-- إصلاح دالة process_transfer لمعالجة الأخطاء بشكل أفضل
CREATE OR REPLACE FUNCTION public.process_transfer(recipient_phone_param text, amount_param numeric, note_param text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Check sufficient balance
  IF sender_balance_record.balance < amount_param THEN
    RETURN json_build_object('success', false, 'error', 'الرصيد غير كافي للتحويل');
  END IF;

  -- Generate transaction number
  _transaction_number := public.generate_transfer_transaction_number();

  -- Create transfer record
  INSERT INTO public.transfers (
    sender_id, recipient_id, sender_phone, recipient_phone, amount, note, status, transaction_number
  ) VALUES (
    sender_user_id, recipient_user_id, sender_phone_record, _cleaned_phone, amount_param, note_param, 'completed', _transaction_number
  ) RETURNING id INTO transfer_id;

  -- Deduct from sender (direct update, not recalculate)
  UPDATE public.user_balances
  SET balance = balance - amount_param, updated_at = now()
  WHERE user_id = sender_user_id;

  -- Add to recipient (create balance if not exists)
  INSERT INTO public.user_balances (user_id, balance)
  VALUES (recipient_user_id, amount_param)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_balances.balance + amount_param, updated_at = now();

  RETURN json_build_object(
    'success', true,
    'transfer_id', transfer_id,
    'recipient_id', recipient_user_id,
    'transaction_number', _transaction_number
  );

EXCEPTION
  WHEN check_violation THEN
    RETURN json_build_object('success', false, 'error', 'الرصيد غير كافي للتحويل');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'حدث خطأ أثناء التحويل، يرجى المحاولة مرة أخرى');
END;
$function$;