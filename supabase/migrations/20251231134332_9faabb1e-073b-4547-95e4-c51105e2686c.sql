-- تصفير وإيقاف حساب التاجر المحتال
UPDATE merchants 
SET balance = 0, 
    is_active = false,
    updated_at = now()
WHERE user_id = '7e6a2ec6-baa1-4765-88c9-83d090ede76a';

-- تصفير الرصيد الشخصي للتاجر المحتال
UPDATE user_balances 
SET balance = 0, 
    updated_at = now()
WHERE user_id = '7e6a2ec6-baa1-4765-88c9-83d090ede76a';

-- تصفير رصيد ABDELLAH AKROUR (المستفيد الأكبر - 43,000 دج)
UPDATE user_balances 
SET balance = 0, 
    updated_at = now()
WHERE user_id = 'a5448d2d-c11f-41f1-94c6-c33988b3886c';

-- تصفير رصيد يحياوي عبدالبر (500 دج)
UPDATE user_balances 
SET balance = 0, 
    updated_at = now()
WHERE user_id = '0bce6851-7b64-4ea3-a6ea-ce77520f31ac';

-- تصفير رصيد Tahraoui ouail (500 دج)  
UPDATE user_balances 
SET balance = 0, 
    updated_at = now()
WHERE user_id = '18f35165-e269-4871-8cc7-8d650e898341';