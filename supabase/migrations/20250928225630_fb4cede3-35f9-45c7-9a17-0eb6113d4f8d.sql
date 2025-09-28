-- إصلاح مشاكل RLS للجدول profiles
-- المشكلة: سياسات RLS متضاربة تمنع إنشاء ملفات شخصية جديدة

-- حذف جميع سياسات INSERT الموجودة وإنشاء سياسة واحدة واضحة
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.profiles;

-- إنشاء سياسة INSERT جديدة وواضحة
CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- إنشاء إعدادات payment wallets الأساسية لتجنب خطأ التحميل
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
(
  'payment_wallets',
  '{
    "baridimob": {"number": "", "name": ""},
    "ccp": {"number": "", "name": ""},
    "edahabiya": {"number": "", "name": ""}
  }'::jsonb,
  'إعدادات محافظ الدفع الرقمية'
)
ON CONFLICT (setting_key) DO NOTHING;