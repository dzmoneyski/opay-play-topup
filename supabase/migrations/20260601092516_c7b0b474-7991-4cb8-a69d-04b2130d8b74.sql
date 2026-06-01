-- Remove broad public SELECT (listing) policies on game-charge-proofs
DROP POLICY IF EXISTS "Anyone can view game charge proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to game-charge-proofs" ON storage.objects;

-- Remove redundant broad authenticated upload policy (owner-scoped + admin upload policies remain)
DROP POLICY IF EXISTS "Allow authenticated uploads to game-charge-proofs" ON storage.objects;