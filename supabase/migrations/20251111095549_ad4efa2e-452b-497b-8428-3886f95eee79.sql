-- Create AliExpress orders table
CREATE TABLE aliexpress_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  product_url TEXT NOT NULL,
  product_title TEXT NOT NULL,
  product_image TEXT,
  price_usd NUMERIC NOT NULL,
  price_dzd NUMERIC NOT NULL,
  exchange_rate NUMERIC NOT NULL,
  service_fee NUMERIC NOT NULL DEFAULT 0,
  shipping_fee NUMERIC NOT NULL DEFAULT 0,
  total_dzd NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  delivery_address TEXT NOT NULL,
  delivery_phone TEXT NOT NULL,
  delivery_name TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  tracking_number TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE aliexpress_orders ENABLE ROW LEVEL SECURITY;

-- Policies for users
CREATE POLICY "Users can create their own orders"
  ON aliexpress_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own orders"
  ON aliexpress_orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policies for admins
CREATE POLICY "Admins can view all orders"
  ON aliexpress_orders
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update orders"
  ON aliexpress_orders
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default AliExpress settings
INSERT INTO platform_settings (setting_key, setting_value, description)
VALUES 
  ('aliexpress_exchange_rate', '{"rate": 270, "last_updated": "2025-01-01"}', 'سعر صرف الدولار مقابل الدينار الجزائري'),
  ('aliexpress_fees', '{"service_fee_percentage": 10, "default_shipping_fee": 1500, "min_service_fee": 500}', 'رسوم خدمة AliExpress والشحن')
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for faster queries
CREATE INDEX idx_aliexpress_orders_user_id ON aliexpress_orders(user_id);
CREATE INDEX idx_aliexpress_orders_status ON aliexpress_orders(status);
CREATE INDEX idx_aliexpress_orders_created_at ON aliexpress_orders(created_at DESC);