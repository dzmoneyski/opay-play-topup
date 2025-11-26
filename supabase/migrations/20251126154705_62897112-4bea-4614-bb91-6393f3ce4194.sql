-- إنشاء سجلات التحقق للمستخدمين الموثقين والمرفوضين
-- هذا سيسمح بعرضهم في صفحة التحقق من الهوية

INSERT INTO verification_requests (
  user_id,
  national_id,
  full_name,
  id_front_image,
  id_back_image,
  status,
  submitted_at,
  reviewed_at,
  reviewed_by
)
SELECT 
  p.user_id,
  COALESCE(p.national_id, 'غير متوفر'),
  COALESCE(p.full_name, 'غير متوفر'),
  'legacy/no-image-front.jpg',
  'legacy/no-image-back.jpg',
  CASE 
    WHEN p.identity_verification_status = 'verified' THEN 'approved'
    WHEN p.identity_verification_status = 'rejected' THEN 'rejected'
    ELSE 'pending'
  END,
  COALESCE(p.created_at, NOW()),
  CASE 
    WHEN p.identity_verification_status IN ('verified', 'rejected') THEN COALESCE(p.updated_at, NOW())
    ELSE NULL
  END,
  NULL
FROM profiles p
WHERE p.identity_verification_status IN ('verified', 'rejected')
  AND NOT EXISTS (
    SELECT 1 FROM verification_requests vr 
    WHERE vr.user_id = p.user_id
  );

-- إضافة تعليق
COMMENT ON TABLE verification_requests IS 'تم إضافة السجلات القديمة للمستخدمين الموثقين والمرفوضين';