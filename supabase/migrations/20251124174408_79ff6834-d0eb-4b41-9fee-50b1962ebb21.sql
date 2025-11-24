-- Create delivery fee settings table
CREATE TABLE IF NOT EXISTS public.delivery_fee_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  default_fee NUMERIC NOT NULL DEFAULT 400.00,
  wilaya_specific_fees JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create card delivery orders table
CREATE TABLE IF NOT EXISTS public.card_delivery_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  wilaya TEXT NOT NULL,
  address TEXT NOT NULL,
  card_amount NUMERIC NOT NULL,
  delivery_fee NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'cod_pending',
  delivery_notes TEXT,
  admin_notes TEXT,
  tracking_number TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_delivery_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_fee_settings
CREATE POLICY "Everyone can view delivery fee settings"
  ON public.delivery_fee_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage delivery fee settings"
  ON public.delivery_fee_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for card_delivery_orders
CREATE POLICY "Users can create their own card delivery orders"
  ON public.card_delivery_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own card delivery orders"
  ON public.card_delivery_orders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all card delivery orders"
  ON public.card_delivery_orders
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update card delivery orders"
  ON public.card_delivery_orders
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete card delivery orders"
  ON public.card_delivery_orders
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_card_delivery_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER card_delivery_orders_updated_at
  BEFORE UPDATE ON public.card_delivery_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_card_delivery_orders_updated_at();

-- Insert default delivery fee settings
INSERT INTO public.delivery_fee_settings (default_fee, wilaya_specific_fees)
VALUES (400.00, '{}'::jsonb);