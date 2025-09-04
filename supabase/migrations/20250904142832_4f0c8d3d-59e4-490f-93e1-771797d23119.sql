-- Make deposit-receipts bucket public so admins can view receipt images
UPDATE storage.buckets 
SET public = true 
WHERE id = 'deposit-receipts';

-- Create RLS policy to allow admins to view all receipt images
CREATE POLICY "Admins can view all deposit receipts" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'deposit-receipts' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow public access to deposit receipts since bucket is now public
CREATE POLICY "Public access to deposit receipts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'deposit-receipts');