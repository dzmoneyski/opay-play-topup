-- إضافة إعدادات AliExpress في platform_settings
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
  ('aliexpress_exchange_rate', '250', 'سعر صرف الدولار إلى الدينار الجزائري'),
  ('aliexpress_service_fee_percentage', '5', 'نسبة العمولة على طلبات AliExpress'),
  ('aliexpress_default_shipping_fee', '10', 'رسوم الشحن الافتراضية بالدولار')
ON CONFLICT (setting_key) DO UPDATE
  SET setting_value = EXCLUDED.setting_value,
      description = EXCLUDED.description;