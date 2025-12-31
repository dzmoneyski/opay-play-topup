
-- تصفير رصيد التاجر المحتال AKROUR ABDELLAH
UPDATE user_balances 
SET balance = 0, 
    updated_at = now()
WHERE user_id = '7e6a2ec6-baa1-4765-88c9-83d090ede76a';

-- تصفير رصيد ABDELLAH AKROUR (المستفيد من الاحتيال)
UPDATE user_balances 
SET balance = 0, 
    updated_at = now()
WHERE user_id = 'a5448d2d-c11f-41f1-94c6-c33988b3886c';
