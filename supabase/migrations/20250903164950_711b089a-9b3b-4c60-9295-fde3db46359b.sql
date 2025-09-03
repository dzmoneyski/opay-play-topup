-- Add activation fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone TEXT,
ADD COLUMN national_id TEXT,
ADD COLUMN is_phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN is_identity_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN is_account_activated BOOLEAN DEFAULT FALSE,
ADD COLUMN phone_verification_code TEXT,
ADD COLUMN phone_verification_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN identity_verification_status TEXT DEFAULT 'pending' CHECK (identity_verification_status IN ('pending', 'verified', 'rejected'));

-- Create verification requests table
CREATE TABLE public.verification_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  national_id TEXT NOT NULL,
  national_id_front_image TEXT,
  national_id_back_image TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on verification_requests
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for verification_requests
CREATE POLICY "Users can view their own verification requests" 
ON public.verification_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification requests" 
ON public.verification_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verification requests" 
ON public.verification_requests 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on verification_requests
CREATE TRIGGER update_verification_requests_updated_at
BEFORE UPDATE ON public.verification_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update account activation status
CREATE OR REPLACE FUNCTION public.update_account_activation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update account activation status based on phone and identity verification
  UPDATE public.profiles 
  SET is_account_activated = (NEW.is_phone_verified = TRUE AND NEW.is_identity_verified = TRUE)
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically update activation status
CREATE TRIGGER update_account_activation_trigger
AFTER UPDATE OF is_phone_verified, is_identity_verified ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_account_activation_status();