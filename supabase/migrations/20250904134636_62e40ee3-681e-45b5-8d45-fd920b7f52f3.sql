-- Add additional fields for identity verification to match ID card information
ALTER TABLE public.verification_requests 
ADD COLUMN full_name_on_id TEXT,
ADD COLUMN date_of_birth DATE,
ADD COLUMN place_of_birth TEXT,
ADD COLUMN address TEXT;