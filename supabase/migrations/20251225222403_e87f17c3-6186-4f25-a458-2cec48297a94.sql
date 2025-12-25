-- إضافة حقول الموقع لجدول المتاجر
ALTER TABLE public.merchants
ADD COLUMN IF NOT EXISTS wilaya TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS street_address TEXT;

-- إنشاء فهرس على الولاية للبحث السريع
CREATE INDEX IF NOT EXISTS idx_merchants_wilaya ON public.merchants(wilaya);
CREATE INDEX IF NOT EXISTS idx_merchants_city ON public.merchants(city);