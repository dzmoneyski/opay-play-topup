-- حذف جدول طلبات AliExpress
DROP TABLE IF EXISTS public.aliexpress_orders CASCADE;

-- حذف إعدادات AliExpress من platform_settings
DELETE FROM public.platform_settings 
WHERE setting_key IN ('aliexpress_exchange_rate', 'aliexpress_fees');