-- Secure profiles table: remove public SELECT and restrict to owner/admin
-- 1) Drop public-read policy if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Profiles are viewable by everyone'
  ) THEN
    EXECUTE 'ALTER TABLE public.profiles DROP POLICY "Profiles are viewable by everyone"';
  END IF;
END$$;

-- 2) Ensure policy for users to view their own profile exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Users can view their own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id)';
  END IF;
END$$;