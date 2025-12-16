-- Remove public SELECT policy from game-charge-proofs bucket
-- This fixes the security issue where anyone could view uploaded proof images

DROP POLICY IF EXISTS "Allow public to view game charge proofs" ON storage.objects;

-- Create a policy that only allows the owner and admins to view proofs
CREATE POLICY "Users can view own game charge proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'game-charge-proofs' 
  AND (
    -- User can view their own uploads (folder matches their user_id)
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Admins can view all proofs
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);