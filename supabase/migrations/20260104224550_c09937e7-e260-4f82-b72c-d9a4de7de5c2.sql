
-- تصحيح أرصدة المستخدمين

-- 1. خصم 80 دج من امين محلي (حق الموقع)
UPDATE user_balances 
SET balance = 160.00, updated_at = now()
WHERE user_id = '7b0eecd8-a319-4256-8fd3-db40bf137e13';

-- 2. خصم 110 دج من Islam Tebbakh (حق الموقع)
UPDATE user_balances 
SET balance = 75.00, updated_at = now()
WHERE user_id = '026bb1f9-3e44-4705-9797-c17d0b37bf58';

-- 3. إضافة 90 دج لـ Azzedine khechai (حقه)
UPDATE user_balances 
SET balance = 1138.50, updated_at = now()
WHERE user_id = '812f8f30-dc97-4350-87d2-c9ebc2b41018';
