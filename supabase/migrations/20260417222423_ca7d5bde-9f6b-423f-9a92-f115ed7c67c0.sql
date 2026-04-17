UPDATE public.deposits
SET status = 'rejected',
    admin_notes = 'لم يصلنا رسالة الفليكسي للهاتف',
    processed_at = now(),
    updated_at = now()
WHERE status = 'pending'
  AND payment_method = 'flexy_mobilis';