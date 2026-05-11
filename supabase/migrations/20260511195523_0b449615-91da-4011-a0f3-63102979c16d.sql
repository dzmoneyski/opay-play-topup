
-- 1. phone_verification_codes: remove user INSERT/UPDATE
DROP POLICY IF EXISTS "Users can insert their own verification codes" ON public.phone_verification_codes;
DROP POLICY IF EXISTS "Users can update their own verification codes" ON public.phone_verification_codes;

-- 2. user_balances: remove user INSERT
DROP POLICY IF EXISTS "Users can insert their own balance" ON public.user_balances;

-- 3. rate_limits: remove user INSERT/UPDATE
DROP POLICY IF EXISTS "Users can insert own rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users can update own rate limits" ON public.rate_limits;

-- 4. Fix identity-documents admin policy (remove the OR true bug)
DROP POLICY IF EXISTS "Admins can view all identity documents" ON storage.objects;
CREATE POLICY "Admins can view all identity documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 5. Scope game-charge-proofs DELETE/UPDATE to owner (folder = auth.uid())
DROP POLICY IF EXISTS "Allow authenticated delete from game-charge-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update to game-charge-proofs" ON storage.objects;

CREATE POLICY "Owners or admins can delete game-charge-proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'game-charge-proofs'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Owners or admins can update game-charge-proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'game-charge-proofs'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
)
WITH CHECK (
  bucket_id = 'game-charge-proofs'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- 6. Add scoped DELETE policies for deposit-receipts and digital-card-receipts
DROP POLICY IF EXISTS "Owners or admins can delete deposit-receipts" ON storage.objects;
CREATE POLICY "Owners or admins can delete deposit-receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'deposit-receipts'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Owners or admins can delete digital-card-receipts" ON storage.objects;
CREATE POLICY "Owners or admins can delete digital-card-receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'digital-card-receipts'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);
