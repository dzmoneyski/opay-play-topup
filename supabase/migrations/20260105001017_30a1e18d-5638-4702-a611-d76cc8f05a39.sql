-- حذف الدالة القديمة أولاً ثم إعادة إنشائها

DROP FUNCTION IF EXISTS public.reject_withdrawal(uuid, uuid, text);

CREATE FUNCTION public.reject_withdrawal(
  _admin_id UUID,
  _withdrawal_id UUID,
  _reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _w RECORD;
  _total_to_return NUMERIC;
BEGIN
  -- التحقق من صلاحيات الأدمن
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can reject withdrawals';
  END IF;
  
  -- ====== قفل الصف لمنع race conditions ======
  SELECT user_id, amount, COALESCE(fee_amount, 0) as fee_amount, status
  INTO _w
  FROM public.withdrawals
  WHERE id = _withdrawal_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'طلب السحب غير موجود';
  END IF;

  -- ====== التحقق من أن الحالة pending فقط ======
  IF _w.status <> 'pending' THEN
    RAISE EXCEPTION 'لا يمكن رفض طلب تمت معالجته مسبقاً (الحالة: %)', _w.status;
  END IF;

  _total_to_return := _w.amount + _w.fee_amount;
  
  -- تحديث حالة السحب
  UPDATE public.withdrawals 
  SET status = 'rejected',
      processed_at = now(),
      processed_by = _admin_id,
      admin_notes = _reason,
      updated_at = now()
  WHERE id = _withdrawal_id;

  -- إرجاع المبلغ + الرسوم للرصيد
  UPDATE user_balances
  SET balance = balance + _total_to_return,
      updated_at = now()
  WHERE user_id = _w.user_id;

  -- حذف سجل الرسوم من platform_ledger
  DELETE FROM public.platform_ledger
  WHERE transaction_id = _withdrawal_id 
    AND transaction_type = 'withdrawal_fee';

EXCEPTION
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'الطلب قيد المعالجة، يرجى الانتظار';
END;
$$;