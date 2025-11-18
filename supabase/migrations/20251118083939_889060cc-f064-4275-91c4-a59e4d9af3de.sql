-- Create storage bucket for game charge proof images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'game-charge-proofs',
  'game-charge-proofs',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can upload game charge proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update game charge proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete game charge proofs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view game charge proofs" ON storage.objects;

-- Policy: Admins can upload proof images
CREATE POLICY "Admins can upload game charge proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'game-charge-proofs' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Admins can update proof images
CREATE POLICY "Admins can update game charge proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'game-charge-proofs' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Admins can delete proof images
CREATE POLICY "Admins can delete game charge proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'game-charge-proofs' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Anyone can view proof images (public bucket)
CREATE POLICY "Anyone can view game charge proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'game-charge-proofs');