
-- إزالة سياسة INSERT المباشر من game_topup_orders
DROP POLICY IF EXISTS "Users can create their own orders" ON public.game_topup_orders;

-- إزالة سياسة INSERT المباشر من betting_transactions
DROP POLICY IF EXISTS "Users can create their own betting transactions" ON public.betting_transactions;

-- تعليقات توضيحية
COMMENT ON TABLE public.game_topup_orders IS 'Game topup orders - INSERT only allowed via process_game_topup_order() RPC function';
COMMENT ON TABLE public.betting_transactions IS 'Betting transactions - INSERT only allowed via process_betting_deposit() RPC function';
