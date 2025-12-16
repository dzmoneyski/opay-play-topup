-- تحديث حالة طلب السحب يدوياً
UPDATE public.withdrawals 
SET status = 'approved',
    processed_at = now(),
    admin_notes = 'تمت الموافقة يدوياً - تم إرسال المال للمستخدم'
WHERE id = '1b239a66-d7cf-4e76-a542-c8a9612bc47f'