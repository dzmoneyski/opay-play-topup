-- إصلاح دالة إعادة حساب الرصيد لتأخذ في الاعتبار التحويلات
CREATE OR REPLACE FUNCTION public.recalculate_user_balance(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _total_approved DECIMAL(10,2);
  _total_sent DECIMAL(10,2);
  _total_received DECIMAL(10,2);
  _final_balance DECIMAL(10,2);
BEGIN
  -- حساب إجمالي الودائع المعتمدة
  SELECT COALESCE(SUM(amount), 0.00) INTO _total_approved
  FROM public.deposits 
  WHERE user_id = _user_id AND status = 'approved';
  
  -- حساب إجمالي التحويلات المرسلة
  SELECT COALESCE(SUM(amount), 0.00) INTO _total_sent
  FROM public.transfers 
  WHERE sender_id = _user_id AND status = 'completed';
  
  -- حساب إجمالي التحويلات المستلمة
  SELECT COALESCE(SUM(amount), 0.00) INTO _total_received
  FROM public.transfers 
  WHERE recipient_id = _user_id AND status = 'completed';
  
  -- حساب الرصيد النهائي
  _final_balance := _total_approved + _total_received - _total_sent;
  
  -- إنشاء أو تحديث رصيد المستخدم
  INSERT INTO public.user_balances (user_id, balance)
  VALUES (_user_id, _final_balance)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = _final_balance,
    updated_at = now();
END;
$function$