DO $$
DECLARE
  admin_uuid uuid := 'f2f0bf8d-67e2-4a31-9eb2-1a93d9aa0b48'; -- primary admin
  w_id uuid;
  cnt int := 0;
  total_refund numeric := 0;
BEGIN
  -- Use any admin if the hardcoded one doesn't exist
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = admin_uuid AND role = 'admin') THEN
    SELECT user_id INTO admin_uuid FROM user_roles WHERE role = 'admin' LIMIT 1;
  END IF;

  FOR w_id IN SELECT id FROM withdrawals WHERE status = 'pending' LOOP
    BEGIN
      PERFORM reject_withdrawal(w_id, admin_uuid, 'إلغاء جماعي بأمر الإدارة');
      cnt := cnt + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to reject %: %', w_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Rejected % withdrawals', cnt;
END $$;