
CREATE TABLE public.chargily_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'edahabia',
  checkout_id TEXT,
  checkout_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  chargily_fee NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chargily_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chargily payments"
  ON public.chargily_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chargily payments"
  ON public.chargily_payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_chargily_payments_user_id ON public.chargily_payments(user_id);
CREATE INDEX idx_chargily_payments_checkout_id ON public.chargily_payments(checkout_id);
CREATE INDEX idx_chargily_payments_status ON public.chargily_payments(status);

CREATE TRIGGER update_chargily_payments_updated_at
  BEFORE UPDATE ON public.chargily_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
