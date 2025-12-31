
-- إضافة أعمدة الجهاز والشبكة لجدول المحظورين
ALTER TABLE public.blocked_users
ADD COLUMN IF NOT EXISTS device_fingerprint text,
ADD COLUMN IF NOT EXISTS ip_address text,
ADD COLUMN IF NOT EXISTS user_agent text;

-- إنشاء جدول منفصل للأجهزة والشبكات المحظورة
CREATE TABLE IF NOT EXISTS public.blocked_devices (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    device_fingerprint text,
    ip_address text,
    user_agent text,
    reason text NOT NULL,
    blocked_user_id uuid REFERENCES public.blocked_users(id),
    blocked_at timestamp with time zone NOT NULL DEFAULT now(),
    blocked_by uuid
);

-- تفعيل RLS
ALTER TABLE public.blocked_devices ENABLE ROW LEVEL SECURITY;

-- سياسة للمسؤولين
CREATE POLICY "Admins can manage blocked devices" 
ON public.blocked_devices 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- سياسة للتحقق من الحظر (قراءة عامة للتحقق)
CREATE POLICY "Anyone can check if device is blocked" 
ON public.blocked_devices 
FOR SELECT 
USING (true);

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_blocked_devices_fingerprint ON public.blocked_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_blocked_devices_ip ON public.blocked_devices(ip_address);
