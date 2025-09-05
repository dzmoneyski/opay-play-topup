-- 1) Create platform settings table for fee configurations
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for platform settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can access platform settings
CREATE POLICY "Admins can manage platform settings"
ON public.platform_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2) Create platform ledger for tracking revenue
CREATE TABLE IF NOT EXISTS public.platform_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL, -- 'deposit_fee', 'withdrawal_fee', 'transfer_fee'
  transaction_id UUID, -- Reference to original transaction
  user_id UUID NOT NULL,
  fee_amount NUMERIC(10,2) NOT NULL,
  fee_percentage NUMERIC(5,4), -- Store the percentage used
  fee_fixed NUMERIC(10,2), -- Store the fixed amount used
  original_amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'DZD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for platform ledger
ALTER TABLE public.platform_ledger ENABLE ROW LEVEL SECURITY;

-- Only admins can view platform ledger
CREATE POLICY "Admins can view platform ledger"
ON public.platform_ledger
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert into platform ledger (for system operations)
CREATE POLICY "Admins can insert platform ledger"
ON public.platform_ledger
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3) Insert default fee settings
INSERT INTO public.platform_settings (setting_key, setting_value, description) VALUES
('deposit_fees', '{
  "percentage": 0.5,
  "fixed_amount": 0,
  "min_fee": 10,
  "max_fee": 500,
  "enabled": true
}', 'إعدادات رسوم الإيداع'),
('withdrawal_fees', '{
  "percentage": 1.5,
  "fixed_amount": 20,
  "min_fee": 20,
  "max_fee": 1000,
  "enabled": true
}', 'إعدادات رسوم السحب'),
('transfer_fees', '{
  "percentage": 0.5,
  "fixed_amount": 0,
  "min_fee": 5,
  "max_fee": 200,
  "enabled": true,
  "paid_by": "sender"
}', 'إعدادات رسوم التحويل')
ON CONFLICT (setting_key) DO NOTHING;

-- 4) Function to calculate fees
CREATE OR REPLACE FUNCTION public.calculate_fee(
  _amount NUMERIC,
  _fee_config JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  _percentage NUMERIC;
  _fixed NUMERIC;
  _min_fee NUMERIC;
  _max_fee NUMERIC;
  _calculated_fee NUMERIC;
  _enabled BOOLEAN;
BEGIN
  -- Extract fee configuration
  _enabled := COALESCE((_fee_config->>'enabled')::BOOLEAN, false);
  
  IF NOT _enabled THEN
    RETURN jsonb_build_object(
      'fee_amount', 0,
      'net_amount', _amount,
      'fee_percentage', 0,
      'fee_fixed', 0
    );
  END IF;
  
  _percentage := COALESCE((_fee_config->>'percentage')::NUMERIC, 0);
  _fixed := COALESCE((_fee_config->>'fixed_amount')::NUMERIC, 0);
  _min_fee := COALESCE((_fee_config->>'min_fee')::NUMERIC, 0);
  _max_fee := COALESCE((_fee_config->>'max_fee')::NUMERIC, 999999);
  
  -- Calculate fee: percentage + fixed
  _calculated_fee := (_amount * _percentage / 100) + _fixed;
  
  -- Apply min/max limits
  _calculated_fee := GREATEST(_calculated_fee, _min_fee);
  _calculated_fee := LEAST(_calculated_fee, _max_fee);
  
  RETURN jsonb_build_object(
    'fee_amount', _calculated_fee,
    'net_amount', _amount - _calculated_fee,
    'fee_percentage', _percentage,
    'fee_fixed', _fixed
  );
END;
$$;

-- 5) Function to record platform revenue
CREATE OR REPLACE FUNCTION public.record_platform_revenue(
  _transaction_type TEXT,
  _transaction_id UUID,
  _user_id UUID,
  _fee_info JSONB,
  _original_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (_fee_info->>'fee_amount')::NUMERIC > 0 THEN
    INSERT INTO public.platform_ledger (
      transaction_type,
      transaction_id,
      user_id,
      fee_amount,
      fee_percentage,
      fee_fixed,
      original_amount
    ) VALUES (
      _transaction_type,
      _transaction_id,
      _user_id,
      (_fee_info->>'fee_amount')::NUMERIC,
      (_fee_info->>'fee_percentage')::NUMERIC,
      (_fee_info->>'fee_fixed')::NUMERIC,
      _original_amount
    );
  END IF;
END;
$$;