
-- رفض طلبات السحب المعلقة لـ Tahraoui ouail
UPDATE withdrawals 
SET 
  status = 'rejected',
  admin_notes = 'مرفوض - مستخدم محظور بسبب الاحتيال',
  processed_at = now()
WHERE user_id = '18f35165-e269-4871-8cc7-8d650e898341'
  AND status = 'pending';
