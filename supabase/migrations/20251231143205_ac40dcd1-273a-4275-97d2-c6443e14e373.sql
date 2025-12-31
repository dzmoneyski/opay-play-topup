-- تصفير رصيد Tahraoui ouail
UPDATE user_balances 
SET balance = 0, updated_at = now()
WHERE user_id = '18f35165-e269-4871-8cc7-8d650e898341';

-- إزالة مرجع المستخدم من معاملات التجار (لا نحذف السجلات، فقط نزيل المرجع)
UPDATE merchant_transactions 
SET customer_user_id = NULL
WHERE customer_user_id = '18f35165-e269-4871-8cc7-8d650e898341';

-- حذف المستخدم نهائياً من النظام
DELETE FROM auth.users WHERE id = '18f35165-e269-4871-8cc7-8d650e898341';