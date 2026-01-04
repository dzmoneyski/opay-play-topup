
-- خصم 350 د.ج من رصيد المستخدم Rafikkanouni
-- تصحيح لطلب ألعاب تم تنفيذه بدون خصم الرصيد

UPDATE user_balances 
SET balance = balance - 350,
    updated_at = now()
WHERE user_id = 'd81a8258-2852-47cf-b493-dde962d70388';

-- تسجيل العملية في platform_ledger للتوثيق
INSERT INTO platform_ledger (
  user_id,
  transaction_type,
  original_amount,
  fee_amount,
  transaction_id,
  currency
) VALUES (
  'd81a8258-2852-47cf-b493-dde962d70388',
  'game_topup_correction',
  350,
  0,
  '84634842-afe8-4126-a78a-66a8707ede7e',
  'DZD'
);

-- إضافة سجل في fraud_attempts للتوثيق
INSERT INTO fraud_attempts (
  user_id,
  attempt_type,
  details
) VALUES (
  'd81a8258-2852-47cf-b493-dde962d70388',
  'direct_insert_bypass',
  '{"order_id": "84634842-afe8-4126-a78a-66a8707ede7e", "amount": 350, "platform": "Free Fire", "corrected": true, "correction_date": "2026-01-04"}'::jsonb
);
