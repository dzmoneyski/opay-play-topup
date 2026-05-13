
DO $$
DECLARE
  w RECORD;
  refund NUMERIC;
BEGIN
  FOR w IN SELECT id, user_id, amount, COALESCE(fee_amount,0) AS fee_amount FROM public.withdrawals WHERE status = 'pending' LOOP
    refund := w.amount + w.fee_amount;
    INSERT INTO public.user_balances (user_id, balance)
      VALUES (w.user_id, refund)
      ON CONFLICT (user_id) DO UPDATE SET balance = COALESCE(public.user_balances.balance,0) + EXCLUDED.balance;
    UPDATE public.withdrawals
      SET status = 'rejected',
          admin_notes = COALESCE(admin_notes,'') || ' | تم الإلغاء من الإدارة وإرجاع الرصيد',
          processed_at = now(),
          updated_at = now()
      WHERE id = w.id;
  END LOOP;
END $$;
