-- Add transaction_number column to transfers table
ALTER TABLE public.transfers 
ADD COLUMN transaction_number TEXT UNIQUE;

-- Create a sequence for transfer transaction numbers
CREATE SEQUENCE IF NOT EXISTS public.transfers_transaction_seq START 1;

-- Create function to generate transaction number
CREATE OR REPLACE FUNCTION public.generate_transfer_transaction_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next_num BIGINT;
  _num_digits INTEGER;
  _padded_num TEXT;
BEGIN
  -- Get next sequence value
  _next_num := nextval('public.transfers_transaction_seq');
  
  -- Calculate number of digits needed (minimum 5)
  _num_digits := GREATEST(5, LENGTH(_next_num::TEXT));
  
  -- Pad with zeros
  _padded_num := LPAD(_next_num::TEXT, _num_digits, '0');
  
  RETURN _padded_num;
END;
$$;

-- Create trigger to auto-generate transaction number
CREATE OR REPLACE FUNCTION public.set_transfer_transaction_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.transaction_number IS NULL THEN
    NEW.transaction_number := generate_transfer_transaction_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_transfer_transaction_number ON public.transfers;
CREATE TRIGGER trigger_set_transfer_transaction_number
  BEFORE INSERT ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION set_transfer_transaction_number();

-- Update existing transfers with transaction numbers (if any exist)
DO $$
DECLARE
  _transfer RECORD;
BEGIN
  FOR _transfer IN 
    SELECT id FROM public.transfers WHERE transaction_number IS NULL ORDER BY created_at
  LOOP
    UPDATE public.transfers 
    SET transaction_number = generate_transfer_transaction_number()
    WHERE id = _transfer.id;
  END LOOP;
END $$;

-- Add comment
COMMENT ON COLUMN public.transfers.transaction_number IS 'Unique transaction reference number, auto-generated with pattern 00001, 00002, ..., 99999, 000001, etc.';