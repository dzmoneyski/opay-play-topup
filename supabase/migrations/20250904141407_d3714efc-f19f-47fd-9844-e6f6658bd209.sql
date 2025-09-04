-- Create deposits table for managing deposit requests
CREATE TABLE public.deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payment_method TEXT NOT NULL, -- 'baridimob', 'ccp', 'edahabiya'
  amount DECIMAL(10,2) NOT NULL,
  transaction_id TEXT,
  receipt_image TEXT, -- path to uploaded receipt image
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- Create policies for deposits
CREATE POLICY "Users can view their own deposits" 
ON public.deposits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deposits" 
ON public.deposits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all deposits" 
ON public.deposits 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all deposits" 
ON public.deposits 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_deposits_updated_at
BEFORE UPDATE ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for deposit receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('deposit-receipts', 'deposit-receipts', false);

-- Create policies for deposit receipt uploads
CREATE POLICY "Users can upload their own deposit receipts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'deposit-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own deposit receipts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'deposit-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all deposit receipts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'deposit-receipts' AND has_role(auth.uid(), 'admin'));

-- Create function to approve deposit request
CREATE OR REPLACE FUNCTION public.approve_deposit(_deposit_id uuid, _admin_id uuid, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
  _amount DECIMAL(10,2);
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve deposits';
  END IF;
  
  -- Get deposit details and update it
  UPDATE public.deposits 
  SET status = 'approved',
      processed_at = now(),
      processed_by = _admin_id,
      admin_notes = _notes
  WHERE id = _deposit_id
  RETURNING user_id, amount INTO _user_id, _amount;
  
  -- Here you would typically update user balance
  -- For now, we'll just mark it as approved
END;
$function$;