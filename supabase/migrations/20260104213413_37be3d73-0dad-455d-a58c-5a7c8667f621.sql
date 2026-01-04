
-- حذف سياسة INSERT الموجودة
DROP POLICY IF EXISTS "Users can create their own orders" ON public.phone_topup_orders;

-- التأكد من عدم وجود أي سياسة INSERT أخرى
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.phone_topup_orders;
DROP POLICY IF EXISTS "Users can create phone topup orders" ON public.phone_topup_orders;
