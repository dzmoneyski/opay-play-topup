
-- 1) حذف السجلات المكررة والإبقاء على الأحدث فقط
DELETE FROM public.user_withdrawal_accounts a
USING public.user_withdrawal_accounts b
WHERE a.user_id = b.user_id
  AND a.withdrawal_method = b.withdrawal_method
  AND a.created_at < b.created_at;

-- 2) إضافة unique constraint على (user_id, withdrawal_method)
ALTER TABLE public.user_withdrawal_accounts 
ADD CONSTRAINT user_withdrawal_accounts_user_method_unique 
UNIQUE (user_id, withdrawal_method);
