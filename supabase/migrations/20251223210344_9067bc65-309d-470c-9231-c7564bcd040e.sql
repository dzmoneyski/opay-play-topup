-- Drop the existing policy that's causing the conflict
DROP POLICY IF EXISTS "Users can view own deposit receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all deposit receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own deposit receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own game charge proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all game charge proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own game charge proofs" ON storage.objects;

-- Create secure RLS policies for deposit-receipts bucket
-- Users can only view their own receipts (based on folder structure user_id/filename)
CREATE POLICY "Users can view own deposit receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'deposit-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all deposit receipts
CREATE POLICY "Admins can view all deposit receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'deposit-receipts' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Users can upload their own deposit receipts
CREATE POLICY "Users can upload own deposit receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'deposit-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create secure RLS policies for game-charge-proofs bucket
-- Users can only view their own proofs
CREATE POLICY "Users can view own game charge proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'game-charge-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all game charge proofs
CREATE POLICY "Admins can view all game charge proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'game-charge-proofs' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Users can upload their own game charge proofs
CREATE POLICY "Users can upload own game charge proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'game-charge-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);