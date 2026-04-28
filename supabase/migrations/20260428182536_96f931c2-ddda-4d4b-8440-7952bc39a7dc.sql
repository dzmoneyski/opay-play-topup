DO $$
DECLARE
  admin_uuid uuid;
  w_id uuid;
  cnt int := 0;
BEGIN
  SELECT user_id INTO admin_uuid FROM user_roles WHERE role = 'admin' LIMIT 1;

  FOR w_id IN SELECT id FROM withdrawals WHERE status = 'pending' LOOP
    BEGIN
      PERFORM reject_withdrawal(admin_uuid, w_id, 'إلغاء جماعي بأمر الإدارة');
      cnt := cnt + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed %: %', w_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Rejected % withdrawals', cnt;
END $$;