-- Add foreign key relationship and create test verification request
-- First, add foreign key constraint between verification_requests and profiles
ALTER TABLE public.verification_requests
ADD CONSTRAINT verification_requests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

-- Insert test verification request
INSERT INTO public.verification_requests (
  user_id,
  national_id,
  status,
  submitted_at
) VALUES (
  '14cce3f6-fe8a-4f71-b9af-06556c6e0a01',  -- Your user ID
  '987654321098765',  -- Test national ID
  'pending',
  now()
) ON CONFLICT DO NOTHING;

-- Also add another test request for completeness
INSERT INTO public.verification_requests (
  user_id,
  national_id,
  status,
  submitted_at,
  reviewed_at,
  rejection_reason
) VALUES (
  '14cce3f6-fe8a-4f71-b9af-06556c6e0a01',  -- Your user ID
  '111222333444555',  -- Another test national ID
  'rejected',
  now() - interval '2 days',
  now() - interval '1 day',
  'الصورة غير واضحة، يرجى إرسال صورة أوضح للهوية'
) ON CONFLICT DO NOTHING;