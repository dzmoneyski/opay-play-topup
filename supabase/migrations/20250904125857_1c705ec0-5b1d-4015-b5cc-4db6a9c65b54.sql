-- Insert test verification requests
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
);

-- Add another test request that's already rejected to show the history
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
);