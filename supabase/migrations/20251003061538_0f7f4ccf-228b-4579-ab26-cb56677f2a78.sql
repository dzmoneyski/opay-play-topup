-- Fix RLS policies for profiles table
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create PERMISSIVE policies (OR logic) so users can view their own profile OR admins can view all
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix RLS policies for user_balances table
DROP POLICY IF EXISTS "Users can view their own balance" ON public.user_balances;
DROP POLICY IF EXISTS "Admins can view all balances" ON public.user_balances;

-- Create PERMISSIVE policies for user_balances
CREATE POLICY "Users can view their own balance"
ON public.user_balances
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all balances"
ON public.user_balances
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));