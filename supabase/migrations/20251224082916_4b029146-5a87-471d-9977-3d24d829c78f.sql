-- Reject all pending withdrawals and refund the amounts
DO $$
DECLARE
  w RECORD;
BEGIN
  FOR w IN SELECT id, user_id, amount FROM withdrawals WHERE status = 'pending'
  LOOP
    -- Update withdrawal status to rejected
    UPDATE withdrawals 
    SET status = 'rejected',
        admin_notes = 'تطبيق بريد الجزائر لا يعمل حالياً. يرجى إعادة المحاولة لاحقاً.',
        processed_at = now()
    WHERE id = w.id;
    
    -- Refund the amount to user balance
    UPDATE user_balances 
    SET balance = balance + w.amount,
        updated_at = now()
    WHERE user_id = w.user_id;
  END LOOP;
END $$;