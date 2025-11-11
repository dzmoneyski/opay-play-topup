-- Add proof_image_url column to game_topup_orders table
ALTER TABLE public.game_topup_orders 
ADD COLUMN IF NOT EXISTS proof_image_url TEXT;

-- Create storage bucket for game charge proofs if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-charge-proofs', 'game-charge-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for game charge proofs
CREATE POLICY "Allow authenticated uploads to game-charge-proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'game-charge-proofs');

CREATE POLICY "Allow public read access to game-charge-proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'game-charge-proofs');

CREATE POLICY "Allow authenticated update to game-charge-proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'game-charge-proofs');

CREATE POLICY "Allow authenticated delete from game-charge-proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'game-charge-proofs');