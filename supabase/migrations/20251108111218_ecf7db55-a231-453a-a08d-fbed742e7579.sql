-- Sync referred_by_code from auth to profiles and backfill missing referrals
CREATE OR REPLACE FUNCTION public.sync_referred_by_code_from_auth()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated_count INTEGER := 0;
BEGIN
  -- Copy referred_by_code from auth.users metadata where missing on profiles
  UPDATE public.profiles p
  SET referred_by_code = NULLIF(TRIM(u.raw_user_meta_data->>'referred_by_code'), '')
  FROM auth.users u
  WHERE p.user_id = u.id
    AND p.referred_by_code IS NULL
    AND NULLIF(TRIM(u.raw_user_meta_data->>'referred_by_code'), '') IS NOT NULL;

  GET DIAGNOSTICS _updated_count = ROW_COUNT;

  RETURN json_build_object('success', true, 'updated_count', _updated_count);
END;
$$;

-- Execute sync then backfill referrals for any profile that now has a code but no referral row
DO $$
DECLARE
  _synced json;
  rec RECORD;
BEGIN
  -- 1) Sync metadata -> profiles
  SELECT public.sync_referred_by_code_from_auth() INTO _synced;

  -- 2) Create missing referrals for users who have referred_by_code but no referrals yet
  FOR rec IN
    SELECT p.user_id
    FROM public.profiles p
    LEFT JOIN public.referrals r ON r.referred_user_id = p.user_id
    WHERE p.referred_by_code IS NOT NULL
      AND TRIM(p.referred_by_code) <> ''
      AND r.id IS NULL
  LOOP
    PERFORM public.ensure_user_referral(rec.user_id);
  END LOOP;
END $$;