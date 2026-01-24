
-- Add fee columns to phone_operators table
ALTER TABLE public.phone_operators 
ADD COLUMN IF NOT EXISTS fee_type text NOT NULL DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS fee_value numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fee_min numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fee_max numeric DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN phone_operators.fee_type IS 'percentage or fixed';
COMMENT ON COLUMN phone_operators.fee_value IS 'Fee value (percentage 0-100 or fixed amount in DZD)';
COMMENT ON COLUMN phone_operators.fee_min IS 'Minimum fee amount in DZD';
COMMENT ON COLUMN phone_operators.fee_max IS 'Maximum fee amount in DZD (null for no limit)';

-- Add global phone topup settings
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES (
  'phone_topup_settings',
  '{"enabled": true, "global_fee_type": "percentage", "global_fee_value": 0, "global_fee_min": 0, "global_fee_max": null, "use_operator_fees": true}'::jsonb,
  'إعدادات شحن الهاتف العامة'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Add fee columns to phone_topup_orders to track fees
ALTER TABLE public.phone_topup_orders
ADD COLUMN IF NOT EXISTS fee_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount numeric NOT NULL DEFAULT 0;

-- Update existing orders to have correct total_amount
UPDATE public.phone_topup_orders 
SET total_amount = amount 
WHERE total_amount = 0;
