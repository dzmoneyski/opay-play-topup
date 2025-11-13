-- دالة للموافقة على طلب تحويل من الجالية
CREATE OR REPLACE FUNCTION public.approve_diaspora_transfer(
  _transfer_id UUID,
  _admin_id UUID,
  _exchange_rate NUMERIC,
  _received_amount NUMERIC DEFAULT NULL,
  _admin_notes TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _transfer RECORD;
  _final_amount_dzd NUMERIC;
  _user_id UUID;
BEGIN
  -- التحقق من صلاحية المشرف
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'صلاحيات غير كافية');
  END IF;

  -- الحصول على بيانات الطلب
  SELECT * INTO _transfer
  FROM public.diaspora_transfers
  WHERE id = _transfer_id AND status = 'pending';

  IF _transfer IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'الطلب غير موجود أو تمت معالجته');
  END IF;

  _user_id := _transfer.sender_id;

  -- إذا تم تحديد مبلغ مستلم مختلف، استخدمه، وإلا استخدم المبلغ الأصلي
  IF _received_amount IS NOT NULL AND _received_amount > 0 THEN
    _final_amount_dzd := _received_amount * _exchange_rate;
  ELSE
    _final_amount_dzd := _transfer.amount * _exchange_rate;
  END IF;

  -- تحديث حالة الطلب
  UPDATE public.diaspora_transfers
  SET 
    status = 'approved',
    processed_at = now(),
    processed_by = _admin_id,
    exchange_rate = _exchange_rate,
    amount_dzd = _final_amount_dzd,
    admin_notes = _admin_notes
  WHERE id = _transfer_id;

  -- إنشاء إيداع معتمد للمستخدم
  INSERT INTO public.deposits (
    user_id,
    amount,
    payment_method,
    status,
    admin_notes,
    processed_at,
    processed_by
  ) VALUES (
    _user_id,
    _final_amount_dzd,
    'diaspora_transfer',
    'approved',
    'تحويل من الجالية - ' || COALESCE(_transfer.sender_country, '') || 
    CASE WHEN _received_amount IS NOT NULL THEN 
      ' (المبلغ المستلم: ' || _received_amount || ' - الأصلي: ' || _transfer.amount || ')' 
    ELSE '' END,
    now(),
    _admin_id
  );

  -- إعادة حساب رصيد المستخدم
  PERFORM public.recalculate_user_balance(_user_id);

  RETURN json_build_object(
    'success', true,
    'message', 'تمت الموافقة على الطلب بنجاح',
    'amount_dzd', _final_amount_dzd,
    'exchange_rate', _exchange_rate
  );
END;
$$;

-- دالة لرفض طلب تحويل من الجالية
CREATE OR REPLACE FUNCTION public.reject_diaspora_transfer(
  _transfer_id UUID,
  _admin_id UUID,
  _rejection_reason TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- التحقق من صلاحية المشرف
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'صلاحيات غير كافية');
  END IF;

  -- تحديث حالة الطلب
  UPDATE public.diaspora_transfers
  SET 
    status = 'rejected',
    processed_at = now(),
    processed_by = _admin_id,
    admin_notes = _rejection_reason
  WHERE id = _transfer_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'الطلب غير موجود أو تمت معالجته');
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'تم رفض الطلب'
  );
END;
$$;