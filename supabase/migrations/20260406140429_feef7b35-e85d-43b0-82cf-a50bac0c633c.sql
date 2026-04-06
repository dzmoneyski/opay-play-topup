
-- Add missing columns for place_of_birth and address
ALTER TABLE public.verification_requests 
ADD COLUMN IF NOT EXISTS place_of_birth text,
ADD COLUMN IF NOT EXISTS address text;
