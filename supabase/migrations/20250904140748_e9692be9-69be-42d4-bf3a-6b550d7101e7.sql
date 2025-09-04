-- Add selfie_image column to verification_requests table
ALTER TABLE public.verification_requests 
ADD COLUMN selfie_image TEXT;