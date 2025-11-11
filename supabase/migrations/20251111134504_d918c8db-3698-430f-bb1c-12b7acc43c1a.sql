-- Update AliExpress service fee to 1%
UPDATE platform_settings
SET setting_value = jsonb_set(
  setting_value,
  '{service_fee_percentage}',
  '1'::jsonb
)
WHERE setting_key = 'aliexpress_fees';