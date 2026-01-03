
-- الموافقة على طلب شحن الهاتف المعلق
UPDATE phone_topup_orders 
SET 
  status = 'approved',
  admin_notes = 'تمت الموافقة - المبلغ كان حق المستخدم من تحويل سابق قبل إصلاح النظام',
  processed_at = now()
WHERE id = '4715c2e3-5295-4c9e-bcc6-84b6779ab3cd';
