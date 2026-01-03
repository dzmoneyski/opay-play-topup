-- تصحيح السحوبات الثلاثة التي تمت بدون رسوم

-- 1. سحب 5,200 د.ج (OPay) - الرسوم: 1.5% × 5200 + 20 = 78 + 20 = 98 د.ج
UPDATE withdrawals 
SET 
  fee_percentage = 1.5,
  fee_fixed = 20,
  fee_amount = 98,
  net_amount = 5102,
  updated_at = now()
WHERE id = '85c89c51-8dfc-4a99-a946-6a5b8f6b16c9';

-- 2. سحب 2,400 د.ج (Barid Bank) - الرسوم: 1.5% × 2400 + 20 = 36 + 20 = 56 د.ج
UPDATE withdrawals 
SET 
  fee_percentage = 1.5,
  fee_fixed = 20,
  fee_amount = 56,
  net_amount = 2344,
  updated_at = now()
WHERE id = 'cba859d7-1efb-4ce9-b96f-995885635588';

-- 3. سحب 19,000 د.ج (CCP) - الرسوم: 1.5% × 19000 + 20 = 285 + 20 = 305 د.ج
UPDATE withdrawals 
SET 
  fee_percentage = 1.5,
  fee_fixed = 20,
  fee_amount = 305,
  net_amount = 18695,
  updated_at = now()
WHERE id = 'f9fbb714-4a97-4d3c-99fb-9f70f3b2e727';

-- إضافة الإيرادات إلى platform_ledger للسحوبات الثلاثة المصححة

-- سحب 5,200 د.ج
INSERT INTO platform_ledger (user_id, transaction_type, transaction_id, original_amount, fee_amount, fee_percentage, fee_fixed, currency)
VALUES ('37ad65bd-0b1c-480d-bc0f-d33cdaa46207', 'withdrawal_correction', '85c89c51-8dfc-4a99-a946-6a5b8f6b16c9', 5200, 98, 1.5, 20, 'DZD');

-- سحب 2,400 د.ج
INSERT INTO platform_ledger (user_id, transaction_type, transaction_id, original_amount, fee_amount, fee_percentage, fee_fixed, currency)
VALUES ('d15b4813-706b-47bb-b784-5835b8d12f40', 'withdrawal_correction', 'cba859d7-1efb-4ce9-b96f-995885635588', 2400, 56, 1.5, 20, 'DZD');

-- سحب 19,000 د.ج
INSERT INTO platform_ledger (user_id, transaction_type, transaction_id, original_amount, fee_amount, fee_percentage, fee_fixed, currency)
VALUES ('28c740d2-2b8c-48a4-b484-e2fe2bd0d9ec', 'withdrawal_correction', 'f9fbb714-4a97-4d3c-99fb-9f70f3b2e727', 19000, 305, 1.5, 20, 'DZD');