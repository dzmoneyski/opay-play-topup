UPDATE platform_settings 
SET setting_value = jsonb_build_object(
  'baridimob', '00799999001990355913',
  'ccp', jsonb_build_object(
    'accountNumber', '0019903559',
    'key', '13',
    'holderName', 'oussama boulainine',
    'location', 'skikda'
  ),
  'edahabiya', ''
)
WHERE setting_key = 'payment_wallets';