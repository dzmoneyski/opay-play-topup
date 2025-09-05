-- إضافة إعدادات محافظ الإيداع
INSERT INTO public.platform_settings (setting_key, setting_value, description) 
VALUES 
  ('payment_wallets', '{"baridimob": "0551234567", "ccp": "1234567890123", "edahabiya": "0987654321"}', 'أرقام محافظ الإيداع للطرق المختلفة')
ON CONFLICT (id) DO NOTHING;