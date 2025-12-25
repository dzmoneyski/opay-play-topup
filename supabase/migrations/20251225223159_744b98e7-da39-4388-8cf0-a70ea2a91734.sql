-- إضافة حقول إضافية للمتاجر
ALTER TABLE public.merchants
ADD COLUMN IF NOT EXISTS map_url TEXT,
ADD COLUMN IF NOT EXISTS store_image TEXT,
ADD COLUMN IF NOT EXISTS store_phone TEXT;