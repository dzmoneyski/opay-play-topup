-- رفض جميع طلبات السحب المعلقة من اليوم التي تمت أثناء فترة تعطيل السحب
-- وإعادة الرصيد للمستخدمين

DO $$
DECLARE
  _withdrawal RECORD;
BEGIN
  -- Loop through all pending withdrawals from today
  FOR _withdrawal IN 
    SELECT id, user_id, amount 
    FROM withdrawals 
    WHERE status = 'pending' 
    AND created_at >= '2026-01-03 00:00:00+00'
  LOOP
    -- Update withdrawal status to rejected
    UPDATE withdrawals 
    SET status = 'rejected',
        admin_notes = 'تم الرفض تلقائياً: طلب السحب تم أثناء فترة تعطيل طريقة السحب',
        processed_at = now(),
        updated_at = now()
    WHERE id = _withdrawal.id;
    
    -- Return the balance to the user
    UPDATE user_balances
    SET balance = balance + _withdrawal.amount,
        updated_at = now()
    WHERE user_id = _withdrawal.user_id;
  END LOOP;
END $$;