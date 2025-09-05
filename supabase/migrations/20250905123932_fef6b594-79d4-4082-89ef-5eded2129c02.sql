-- إنشاء جدول السحب
CREATE TABLE public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  withdrawal_method TEXT NOT NULL, -- 'opay', 'barid_bank', 'ccp', 'cash'
  account_number TEXT, -- رقم الحساب (اختياري للكاش)
  account_holder_name TEXT, -- اسم صاحب الحساب (اختياري للكاش)
  cash_location TEXT, -- موقع الاستلام للكاش
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed'
  notes TEXT, -- ملاحظات المستخدم
  admin_notes TEXT, -- ملاحظات الإدارة
  processed_by UUID, -- معرف الإداري الذي عالج الطلب
  processed_at TIMESTAMP WITH TIME ZONE, -- وقت المعالجة
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للمستخدمين
CREATE POLICY "Users can view their own withdrawals" 
ON public.withdrawals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawals" 
ON public.withdrawals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- سياسات RLS للإداريين
CREATE POLICY "Admins can view all withdrawals" 
ON public.withdrawals 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all withdrawals" 
ON public.withdrawals 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- إضافة trigger للـ updated_at
CREATE TRIGGER update_withdrawals_updated_at
BEFORE UPDATE ON public.withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- دالة لمعالجة طلبات السحب
CREATE OR REPLACE FUNCTION public.approve_withdrawal(
  _withdrawal_id uuid, 
  _admin_id uuid, 
  _notes text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
  _amount DECIMAL(10,2);
BEGIN
  -- التحقق من أن المتصل إداري
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve withdrawals';
  END IF;
  
  -- الحصول على تفاصيل السحب وتحديثه
  UPDATE public.withdrawals 
  SET status = 'approved',
      processed_at = now(),
      processed_by = _admin_id,
      admin_notes = _notes
  WHERE id = _withdrawal_id
  RETURNING user_id, amount INTO _user_id, _amount;
  
  -- خصم المبلغ من رصيد المستخدم
  UPDATE public.user_balances 
  SET balance = balance - _amount,
      updated_at = now()
  WHERE user_id = _user_id;
  
  -- تحديث حالة السحب إلى مكتمل
  UPDATE public.withdrawals 
  SET status = 'completed'
  WHERE id = _withdrawal_id;
END;
$function$;

-- دالة لرفض طلب السحب
CREATE OR REPLACE FUNCTION public.reject_withdrawal(
  _withdrawal_id uuid, 
  _admin_id uuid, 
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- التحقق من أن المتصل إداري
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can reject withdrawals';
  END IF;
  
  -- تحديث طلب السحب
  UPDATE public.withdrawals 
  SET status = 'rejected',
      processed_at = now(),
      processed_by = _admin_id,
      admin_notes = _reason
  WHERE id = _withdrawal_id;
END;
$function$;