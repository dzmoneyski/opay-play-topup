-- Create aliexpress_orders table
CREATE TABLE public.aliexpress_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_url text NOT NULL,
  product_images jsonb DEFAULT '[]'::jsonb,
  product_price numeric NOT NULL,
  shipping_cost numeric NOT NULL,
  total_usd numeric NOT NULL,
  total_dzd numeric NOT NULL,
  exchange_rate numeric NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.aliexpress_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create their own orders"
  ON public.aliexpress_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own orders"
  ON public.aliexpress_orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON public.aliexpress_orders
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update orders"
  ON public.aliexpress_orders
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default exchange rate setting
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
  ('aliexpress_exchange_rate', '{"rate": 270}'::jsonb, 'سعر صرف الدولار للدينار الجزائري لطلبات AliExpress')
ON CONFLICT (setting_key) DO NOTHING;