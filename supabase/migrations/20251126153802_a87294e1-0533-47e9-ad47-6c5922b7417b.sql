-- إعادة تعيين حالة التحقق للمستخدمين الذين لديهم "pending" بدون طلبات
-- هذا سيسمح لهم بإرسال طلبات جديدة

UPDATE profiles
SET 
  identity_verification_status = NULL,
  is_identity_verified = false
WHERE identity_verification_status = 'pending'
  AND NOT EXISTS (
    SELECT 1 
    FROM verification_requests 
    WHERE verification_requests.user_id = profiles.user_id
  );

-- إضافة تعليق
COMMENT ON TABLE verification_requests IS 'جدول طلبات التحقق من الهوية - تم إعادة إنشائه في 2025-11-26';