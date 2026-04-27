DO $$
DECLARE
  w_id uuid;
  admin_uuid uuid := '14cce3f6-fe8a-4f71-b9af-06556c6e0a01';
  cancelled_count int := 0;
  failed_count int := 0;
  err_msg text;
BEGIN
  FOR w_id IN SELECT id FROM withdrawals WHERE status = 'pending'
  LOOP
    BEGIN
      PERFORM reject_withdrawal(admin_uuid, w_id, 'إلغاء جماعي بأمر الإدارة');
      cancelled_count := cancelled_count + 1;
    EXCEPTION WHEN OTHERS THEN
      failed_count := failed_count + 1;
      err_msg := SQLERRM;
      RAISE NOTICE 'فشل إلغاء %: %', w_id, err_msg;
    END;
  END LOOP;
  RAISE NOTICE 'نجح: % | فشل: %', cancelled_count, failed_count;
END $$;