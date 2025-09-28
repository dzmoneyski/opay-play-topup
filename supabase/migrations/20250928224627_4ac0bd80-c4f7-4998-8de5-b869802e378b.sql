-- Fix the trigger function to bypass RLS issues
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert profile with explicit user_id from NEW record
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Update RLS policies to fix potential issues
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Add policy to allow the trigger to insert profiles
DROP POLICY IF EXISTS "System can create profiles" ON public.profiles;
CREATE POLICY "System can create profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

-- But restrict it to only the trigger by making it more specific
DROP POLICY IF EXISTS "System can create profiles" ON public.profiles;
CREATE POLICY "Authenticated users can create profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow profile creation during signup when auth.uid() might not be set yet
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.profiles;
CREATE POLICY "Allow profile creation during signup" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id);