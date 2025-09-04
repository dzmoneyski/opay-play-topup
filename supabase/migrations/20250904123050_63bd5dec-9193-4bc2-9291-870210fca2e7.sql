-- Create user roles system
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Update verification_requests table policies for admin access
CREATE POLICY "Admins can view all verification requests" 
ON public.verification_requests 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all verification requests" 
ON public.verification_requests 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Update profiles table policies for admin access
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Function to approve verification request
CREATE OR REPLACE FUNCTION public.approve_verification_request(_request_id UUID, _admin_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve verification requests';
  END IF;
  
  -- Get user_id from verification request and update it
  UPDATE public.verification_requests 
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = _admin_id
  WHERE id = _request_id
  RETURNING user_id INTO _user_id;
  
  -- Update profile verification status
  UPDATE public.profiles 
  SET is_identity_verified = TRUE,
      identity_verification_status = 'verified'
  WHERE user_id = _user_id;
END;
$$;

-- Function to reject verification request
CREATE OR REPLACE FUNCTION public.reject_verification_request(_request_id UUID, _admin_id UUID, _reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can reject verification requests';
  END IF;
  
  -- Get user_id from verification request and update it
  UPDATE public.verification_requests 
  SET status = 'rejected',
      reviewed_at = now(),
      reviewed_by = _admin_id,
      rejection_reason = _reason
  WHERE id = _request_id
  RETURNING user_id INTO _user_id;
  
  -- Update profile verification status
  UPDATE public.profiles 
  SET is_identity_verified = FALSE,
      identity_verification_status = 'rejected'
  WHERE user_id = _user_id;
END;
$$;