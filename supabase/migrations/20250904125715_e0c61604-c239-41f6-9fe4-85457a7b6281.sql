-- Add a test verification request for testing the admin panel
INSERT INTO public.verification_requests (
  user_id,
  national_id,
  status
) VALUES (
  '14cce3f6-fe8a-4f71-b9af-06556c6e0a01',  -- Your user ID
  '123456789012345',  -- Test national ID
  'pending'
) ON CONFLICT DO NOTHING;