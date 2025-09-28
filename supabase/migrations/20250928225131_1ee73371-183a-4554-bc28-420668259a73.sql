-- Create profile for existing authenticated user
-- Since we cleared all data but user still exists in auth.users
-- We need to manually create the profile for the current user

-- Insert profile for the user who is currently logged in
INSERT INTO public.profiles (user_id, full_name)
VALUES ('14cce3f6-fe8a-4f71-b9af-06556c6e0a01', 'oussama boulainine')
ON CONFLICT (user_id) DO NOTHING;