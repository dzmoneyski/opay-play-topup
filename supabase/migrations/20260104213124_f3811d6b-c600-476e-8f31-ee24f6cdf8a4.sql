
-- إزالة سياسة INSERT المباشر التي تسبب الثغرة
DROP POLICY IF EXISTS "Users can create their own phone topup orders" ON public.phone_topup_orders;

-- إضافة تعليق توضيحي
COMMENT ON TABLE public.phone_topup_orders IS 'Phone topup orders - INSERT only allowed via process_phone_topup_order() RPC function to ensure balance deduction and fee calculation';
