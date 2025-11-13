-- Update diaspora_transfers table to match new flow
-- Remove recipient fields and add payment method and transaction reference

ALTER TABLE public.diaspora_transfers 
  DROP COLUMN IF EXISTS recipient_phone,
  DROP COLUMN IF EXISTS recipient_name,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS transaction_reference TEXT;

-- Update check constraint for status
ALTER TABLE public.diaspora_transfers 
  DROP CONSTRAINT IF EXISTS diaspora_transfers_status_check;

ALTER TABLE public.diaspora_transfers 
  ADD CONSTRAINT diaspora_transfers_status_check 
  CHECK (status IN ('pending', 'processing', 'completed', 'rejected'));