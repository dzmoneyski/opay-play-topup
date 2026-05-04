DO $$
DECLARE
  w RECORD;
BEGIN
  FOR w IN SELECT id, user_id, amount, fee_amount FROM public.withdrawals WHERE status='pending' LOOP
    UPDATE public.user_balances
    SET balance = balance + (w.amount + COALESCE(w.fee_amount,0)),
        updated_at = now()
    WHERE user_id = w.user_id;

    UPDATE public.withdrawals
    SET status='rejected',
        admin_notes='تم الإلغاء من قبل الإدارة - تم إرجاع المبلغ إلى رصيدك',
        processed_at=now(),
        updated_at=now()
    WHERE id = w.id;
  END LOOP;
END $$;