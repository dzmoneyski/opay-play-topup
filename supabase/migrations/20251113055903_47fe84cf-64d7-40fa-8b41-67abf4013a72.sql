-- Create diaspora_transfers table for Algerian diaspora money transfers
CREATE TABLE IF NOT EXISTS public.diaspora_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  sender_country TEXT NOT NULL,
  sender_city TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  exchange_rate NUMERIC(10,4),
  amount_dzd NUMERIC(12,2),
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diaspora_transfers ENABLE ROW LEVEL SECURITY;

-- Users can view their own transfers
CREATE POLICY "Users can view their own diaspora transfers"
ON public.diaspora_transfers
FOR SELECT
USING (auth.uid() = sender_id);

-- Users can create their own transfers
CREATE POLICY "Users can create diaspora transfers"
ON public.diaspora_transfers
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Admins can view all transfers
CREATE POLICY "Admins can view all diaspora transfers"
ON public.diaspora_transfers
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update transfers
CREATE POLICY "Admins can update diaspora transfers"
ON public.diaspora_transfers
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_diaspora_transfers_sender ON public.diaspora_transfers(sender_id);
CREATE INDEX idx_diaspora_transfers_status ON public.diaspora_transfers(status);
CREATE INDEX idx_diaspora_transfers_created_at ON public.diaspora_transfers(created_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_diaspora_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER diaspora_transfers_updated_at
BEFORE UPDATE ON public.diaspora_transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_diaspora_transfers_updated_at();