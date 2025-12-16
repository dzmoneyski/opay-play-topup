-- Fix: Make deposit-receipts bucket private to protect sensitive payment information

-- Set bucket to private
UPDATE storage.buckets SET public = false WHERE id = 'deposit-receipts';

-- Remove the overly permissive public access policy
DROP POLICY IF EXISTS "Public access to deposit receipts" ON storage.objects;

-- Ensure only users can view their own receipts
DROP POLICY IF EXISTS "Users can view own deposit receipts" ON storage.objects;
CREATE POLICY "Users can view own deposit receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deposit-receipts' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Ensure admins can view all receipts
DROP POLICY IF EXISTS "Admins can view all deposit receipts" ON storage.objects;
CREATE POLICY "Admins can view all deposit receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deposit-receipts' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);