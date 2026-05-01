DO $$
DECLARE
  w RECORD;
  admin_uuid UUID;
  refund_amount NUMERIC;
BEGIN
  SELECT user_id INTO admin_uuid FROM user_roles WHERE role = 'admin' LIMIT 1;
  
  FOR w IN SELECT * FROM withdrawals WHERE status = 'pending' LOOP
    refund_amount := COALESCE(w.amount, 0) + COALESCE(w.fee_amount, 0);
    
    UPDATE user_balances
    SET balance = balance + refund_amount,
        updated_at = now()
    WHERE user_id = w.user_id;
    
    UPDATE withdrawals
    SET status = 'rejected',
        admin_notes = 'تم الإلغاء من قبل الإدارة - تم إرجاع المبلغ إلى رصيدك',
        processed_by = admin_uuid,
        processed_at = now(),
        updated_at = now()
    WHERE id = w.id;
  END LOOP;
END $$;