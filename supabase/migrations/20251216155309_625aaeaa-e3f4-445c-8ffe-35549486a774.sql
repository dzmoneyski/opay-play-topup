-- رفض طلب السحب الذي أُنشئ بشكل خاطئ
UPDATE public.withdrawals 
SET status = 'rejected',
    processed_at = now(),
    admin_notes = 'تم الرفض - رصيد غير كافي لتغطية المبلغ والرسوم (4000 دج + 80 دج رسوم = 4080 دج، والرصيد 4000 دج فقط)'
WHERE id = '39a23238-286b-4d72-9cd4-ff2d58d017f5';