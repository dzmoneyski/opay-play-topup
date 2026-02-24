
-- Register 4 fraud network members in blocked_users
INSERT INTO blocked_users (user_id, phone, email, reason)
VALUES 
  ('190bb4cc-eed9-4c55-9682-d76c8c4c8d24', '0562697991', 'zizok1992@gmail.com', 'شبكة سكيكدة: شحن 52 بطاقة مسربة (69,000 دج) وتحويل الأموال إلى Llinabou المحظورة'),
  ('f39cbf75-1242-44d3-8a73-b46d3803078f', '0550850609', 'khrif2026@gmail.com', 'شبكة سكيكدة: شحن 40 بطاقة مسربة (48,000 دج) وتحويل لـ Llinabou ويوسف عيساوي المحظورين'),
  ('d0e1d97b-91dd-4867-ae13-38c783ee9aa0', '0656187381', 'boukhamlahazar@gmail.com', 'شبكة سكيكدة: شحن 40 بطاقة مسربة (46,500 دج) وتحويل مباشر لوافي دلاش'),
  ('999d1309-0313-4c0b-b6de-c5db33989d8e', '0562931739', 'yasserbou103@gmail.com', 'شبكة سكيكدة: شحن 26 بطاقة مسربة (30,500 دج)')
ON CONFLICT (user_id) DO NOTHING;

-- Reject any pending withdrawals for these users
UPDATE withdrawals SET status = 'rejected', admin_notes = 'محظور - شبكة احتيال سكيكدة'
WHERE user_id IN (
  '190bb4cc-eed9-4c55-9682-d76c8c4c8d24',
  'f39cbf75-1242-44d3-8a73-b46d3803078f',
  'd0e1d97b-91dd-4867-ae13-38c783ee9aa0',
  '999d1309-0313-4c0b-b6de-c5db33989d8e'
) AND status = 'pending';

-- Zero balances by recalculating
SELECT recalculate_user_balance('190bb4cc-eed9-4c55-9682-d76c8c4c8d24');
SELECT recalculate_user_balance('f39cbf75-1242-44d3-8a73-b46d3803078f');
SELECT recalculate_user_balance('d0e1d97b-91dd-4867-ae13-38c783ee9aa0');
SELECT recalculate_user_balance('999d1309-0313-4c0b-b6de-c5db33989d8e');
