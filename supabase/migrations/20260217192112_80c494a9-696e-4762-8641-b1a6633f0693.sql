
-- 1. تعطيل الحسابات الثلاثة
UPDATE profiles 
SET is_account_activated = false
WHERE user_id IN (
  '0d6aedbd-00dd-48aa-b020-22ecea85fcd7',
  '191280ff-7211-4d14-81d8-268dd5b020bb',
  'b78e9349-d49b-416b-8871-e4888d7fc74b'
);

-- 2. إضافتهم إلى قائمة المحجوبين
INSERT INTO blocked_users (user_id, reason, email, phone, blocked_by)
VALUES 
  ('0d6aedbd-00dd-48aa-b020-22ecea85fcd7', 'احتيال: استخدام بطاقات هدايا مسربة وتحويل الأموال إلى وافي دلاش - شبكة احتيال منظمة', 'bigbotscd236@gmail.com', '0562335622', '191280ff-7211-4d14-81d8-268dd5b020bb'),
  ('191280ff-7211-4d14-81d8-268dd5b020bb', 'احتيال: تسريب أكواد بطاقات الهدايا بصلاحيات المشرف واستلام الأموال من لينا بوخميلة - صلاحيات مسحوبة', 'wafi.dalach@hotmail.fr', '0660873714', '191280ff-7211-4d14-81d8-268dd5b020bb'),
  ('b78e9349-d49b-416b-8871-e4888d7fc74b', 'احتيال: وسيط في شبكة احتيال مع وافي دلاش ولينا - استقبال تحويلات مشبوهة', 'youcefaissaoui89@gmail.com', '0556219320', '191280ff-7211-4d14-81d8-268dd5b020bb')
ON CONFLICT DO NOTHING;

-- 3. سحب دور الأدمن من وافي دلاش
DELETE FROM user_roles 
WHERE user_id = '191280ff-7211-4d14-81d8-268dd5b020bb' 
AND role = 'admin';
