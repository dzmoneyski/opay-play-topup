
-- Create a trigger to protect sensitive profile columns from direct user modification
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow if called from a SECURITY DEFINER function (admin operations)
  -- Check if the current user is an admin
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  
  -- For regular users, prevent modification of sensitive fields
  IF OLD.is_identity_verified IS DISTINCT FROM NEW.is_identity_verified THEN
    RAISE EXCEPTION 'Cannot modify identity verification status directly';
  END IF;
  
  IF OLD.identity_verification_status IS DISTINCT FROM NEW.identity_verification_status 
     AND NEW.identity_verification_status NOT IN ('pending') THEN
    -- Allow setting to 'pending' (when submitting a request) but not 'approved'/'verified'
    RAISE EXCEPTION 'Cannot set verification status to approved directly';
  END IF;
  
  IF OLD.is_account_activated IS DISTINCT FROM NEW.is_account_activated THEN
    RAISE EXCEPTION 'Cannot modify account activation status directly';
  END IF;
  
  -- Prevent changing national_id once identity is verified
  IF OLD.is_identity_verified = TRUE 
     AND OLD.national_id IS DISTINCT FROM NEW.national_id THEN
    RAISE EXCEPTION 'Cannot change national ID after identity verification';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- Also fix the profiles UPDATE policy to require authentication (currently uses 'public' role)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
