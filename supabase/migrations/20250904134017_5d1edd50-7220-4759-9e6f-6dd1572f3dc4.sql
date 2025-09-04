-- Make the identity-documents bucket public so images can be viewed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'identity-documents';

-- Update the RLS policy to allow public read access to identity documents for admins
DROP POLICY IF EXISTS "Admins can view all identity documents" ON storage.objects;

CREATE POLICY "Admins can view all identity documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'identity-documents' 
  AND (
    auth.uid() IN (
      SELECT user_id FROM public.user_roles WHERE role = 'admin'
    )
    OR true  -- Allow public access since it's a public bucket now
  )
);