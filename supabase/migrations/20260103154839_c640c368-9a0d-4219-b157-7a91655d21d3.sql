-- Add 4G ADSL operator
INSERT INTO public.phone_operators (name, name_ar, slug, min_amount, max_amount, display_order, is_active)
VALUES ('4G ADSL', '4G ADSL', '4g-adsl', 500, 50000, 5, true)
ON CONFLICT (slug) DO NOTHING;