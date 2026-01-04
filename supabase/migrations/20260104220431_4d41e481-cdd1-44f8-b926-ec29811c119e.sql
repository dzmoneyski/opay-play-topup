
-- =====================================================
-- إصلاح المشاكل الأمنية الخطيرة الثلاث
-- =====================================================

-- 1. إزالة سياسة القراءة العلنية لجدول الأجهزة المحظورة
DROP POLICY IF EXISTS "Anyone can check if device is blocked" ON public.blocked_devices;

-- إنشاء سياسة جديدة للمسؤولين فقط
CREATE POLICY "Only admins can view blocked devices"
ON public.blocked_devices
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 2. إزالة سياسة السماح للمستخدمين برؤية حالة حظرهم
DROP POLICY IF EXISTS "Check if user is blocked" ON public.blocked_users;

-- إبقاء الوصول للمسؤولين فقط
CREATE POLICY "Only admins can view blocked users"
ON public.blocked_users
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 3. تأمين جدول أكواد التحقق - إزالة كل السياسات التي تسمح للمستخدمين بالوصول
DROP POLICY IF EXISTS "Users can view their own codes" ON public.phone_verification_codes;
DROP POLICY IF EXISTS "Users can update their own codes" ON public.phone_verification_codes;
DROP POLICY IF EXISTS "Users can delete their own codes" ON public.phone_verification_codes;
DROP POLICY IF EXISTS "Users can insert their own codes" ON public.phone_verification_codes;

-- السماح فقط للنظام (service role) بإدارة أكواد التحقق
-- لا نحتاج سياسات RLS لأن الوصول سيكون عبر service role فقط
-- ولكن نضيف سياسة للمسؤولين للمراقبة
CREATE POLICY "Only admins can view verification codes"
ON public.phone_verification_codes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- منع أي INSERT مباشر من المستخدمين (يجب أن يتم عبر دالة آمنة)
CREATE POLICY "Only system can insert verification codes"
ON public.phone_verification_codes
FOR INSERT
WITH CHECK (false);

-- منع أي UPDATE مباشر من المستخدمين
CREATE POLICY "Only system can update verification codes"
ON public.phone_verification_codes
FOR UPDATE
USING (false);

-- منع أي DELETE مباشر من المستخدمين
CREATE POLICY "Only system can delete verification codes"
ON public.phone_verification_codes
FOR DELETE
USING (false);
