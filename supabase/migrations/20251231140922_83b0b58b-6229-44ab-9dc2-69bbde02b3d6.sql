
-- رفض السحوبات المعلقة لـ Tahraoui ouail
UPDATE withdrawals 
SET status = 'rejected',
    admin_notes = 'مرفوض - مستخدم محظور بسبب الاحتيال',
    processed_at = now()
WHERE user_id = '18f35165-e269-4871-8cc7-8d650e898341' 
AND status = 'pending';

-- تصفير رصيد المستخدم
UPDATE user_balances 
SET balance = 0, 
    updated_at = now()
WHERE user_id = '18f35165-e269-4871-8cc7-8d650e898341';

-- إنشاء جدول المستخدمين المحظورين
CREATE TABLE IF NOT EXISTS public.blocked_users (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE,
    email text,
    phone text,
    reason text NOT NULL,
    blocked_at timestamp with time zone NOT NULL DEFAULT now(),
    blocked_by uuid
);

-- تفعيل RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- سياسة للمسؤولين فقط
CREATE POLICY "Admins can manage blocked users" 
ON public.blocked_users 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- سياسة للتحقق من الحظر عند تسجيل الدخول
CREATE POLICY "Check if user is blocked" 
ON public.blocked_users 
FOR SELECT 
USING (auth.uid() = user_id);

-- إضافة المستخدم المحتال إلى قائمة المحظورين
INSERT INTO public.blocked_users (user_id, email, phone, reason)
VALUES (
    '18f35165-e269-4871-8cc7-8d650e898341',
    'tahraouiouail@gmail.com',
    '0662535174',
    'احتيال مالي - متورط مع التاجر المحتال AKROUR ABDELLAH'
);
