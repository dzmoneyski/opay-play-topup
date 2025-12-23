-- Fix RLS policies for profiles table
-- Remove the problematic "Deny anonymous access" policy and ensure proper access control

-- Drop the problematic deny policy
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

-- Ensure all SELECT policies are properly configured
-- The existing policies already check for auth.uid() which automatically excludes anonymous users

-- For verification_requests table - check and fix policies
DROP POLICY IF EXISTS "Deny anonymous access to verification_requests" ON public.verification_requests;

-- Add explicit policy to ensure only authenticated users can access their own requests
DROP POLICY IF EXISTS "Users can view their own verification requests" ON public.verification_requests;
CREATE POLICY "Users can view their own verification requests"
ON public.verification_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own verification requests" ON public.verification_requests;
CREATE POLICY "Users can create their own verification requests"
ON public.verification_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all verification requests" ON public.verification_requests;
CREATE POLICY "Admins can view all verification requests"
ON public.verification_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update verification requests" ON public.verification_requests;
CREATE POLICY "Admins can update verification requests"
ON public.verification_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));