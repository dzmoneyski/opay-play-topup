-- إعادة حساب أرصدة مستخدمي شحن الهاتف
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT user_id FROM phone_topup_orders
  LOOP
    PERFORM recalculate_user_balance(user_record.user_id);
  END LOOP;
END $$;