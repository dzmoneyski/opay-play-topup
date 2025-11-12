-- Create aliexpress_orders table
CREATE TABLE public.aliexpress_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_url TEXT NOT NULL,
  product_title TEXT NOT NULL,
  product_image TEXT,
  price_usd NUMERIC NOT NULL,
  shipping_cost_usd NUMERIC DEFAULT 0,
  total_usd NUMERIC NOT NULL,
  exchange_rate NUMERIC NOT NULL DEFAULT 250,
  total_dzd NUMERIC NOT NULL,
  service_fee_percentage NUMERIC NOT NULL DEFAULT 5,
  service_fee_dzd NUMERIC NOT NULL,
  final_total_dzd NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  admin_notes TEXT,
  tracking_number TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.aliexpress_orders ENABLE ROW LEVEL SECURITY;

-- Users can create their own orders
CREATE POLICY "Users can create their own orders"
ON public.aliexpress_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own orders
CREATE POLICY "Users can view their own orders"
ON public.aliexpress_orders
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
ON public.aliexpress_orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all orders
CREATE POLICY "Admins can update all orders"
ON public.aliexpress_orders
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_aliexpress_orders_updated_at
BEFORE UPDATE ON public.aliexpress_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_digital_cards_updated_at();