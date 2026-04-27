DO $$
DECLARE
  w_id uuid;
  admin_uuid uuid := '14cce3f6-fe8a-4f71-b9af-06556c6e0a01';
  cancelled_count int := 0;
BEGIN
  FOR w_id IN SELECT id FROM withdrawals WHERE status = 'pending'
  LOOP
    BEGIN
      PERFORM reject_withdrawal(w_id, admin_uuid, 'إلغاء جماعي بأمر الإدارة');
      cancelled_count := cancelled_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'فشل إلغاء السحب %: %', w_id, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'تم إلغاء % سحب بنجاح', cancelled_count;
END $$;