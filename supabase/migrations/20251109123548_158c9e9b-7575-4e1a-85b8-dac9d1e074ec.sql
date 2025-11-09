-- إضافة أعمدة جديدة لجدول digital_card_orders
ALTER TABLE public.digital_card_orders
ADD COLUMN IF NOT EXISTS receipt_image text,
ADD COLUMN IF NOT EXISTS transaction_reference text;

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS public.approve_digital_card_order(uuid, text, text, text);

-- إنشاء دالة الموافقة الجديدة مع صورة الوصل ومعرف المعاملة
CREATE OR REPLACE FUNCTION public.approve_digital_card_order(_order_id uuid, _receipt_image text, _transaction_reference text, _admin_notes text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
  _amount NUMERIC;
  _default_message TEXT;
BEGIN
  -- الحصول على تفاصيل الطلب
  SELECT user_id, amount INTO _user_id, _amount
  FROM public.digital_card_orders
  WHERE id = _order_id AND status = 'pending';

  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'الطلب غير موجود أو تمت معالجته مسبقاً');
  END IF;

  -- رسالة الشكر الافتراضية
  _default_message := 'شكراً لك لثقتك بنا، شارك تجربتك مع الأعضاء في تلغرام الخاص بنا';
  
  -- إضافة الملاحظة إلى الرسالة الافتراضية إذا كانت موجودة
  IF _admin_notes IS NOT NULL AND TRIM(_admin_notes) != '' THEN
    _default_message := _default_message || E'\n\n' || _admin_notes;
  END IF;

  -- تحديث حالة الطلب وإضافة معلومات الوصل
  UPDATE public.digital_card_orders
  SET status = 'completed',
      receipt_image = _receipt_image,
      transaction_reference = _transaction_reference,
      processed_at = now(),
      processed_by = auth.uid(),
      admin_notes = _default_message
  WHERE id = _order_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تمت الموافقة على الطلب بنجاح'
  );
END;
$function$;

-- إنشاء storage bucket للوصولات إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public)
VALUES ('digital-card-receipts', 'digital-card-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- حذف السياسات القديمة إذا كانت موجودة
DROP POLICY IF EXISTS "Admins can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;

-- إنشاء سياسات الوصول للـ storage bucket
CREATE POLICY "Admins can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'digital-card-receipts' AND
  (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ))
);

CREATE POLICY "Admins can view receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'digital-card-receipts' AND
  (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ))
);

CREATE POLICY "Users can view their own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'digital-card-receipts' AND
  (EXISTS (
    SELECT 1 FROM public.digital_card_orders
    WHERE digital_card_orders.user_id = auth.uid()
    AND storage.objects.name LIKE '%' || digital_card_orders.id::text || '%'
  ))
);