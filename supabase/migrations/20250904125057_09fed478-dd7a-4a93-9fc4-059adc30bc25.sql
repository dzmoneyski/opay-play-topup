-- Grant admin role to the provided user_id
INSERT INTO public.user_roles (user_id, role)
VALUES ('14cce3f6-fe8a-4f71-b9af-06556c6e0a01', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;