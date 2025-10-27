-- Create merchant system tables

-- Merchant requests table (for registration)
CREATE TABLE public.merchant_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL, -- 'phone_store', 'gaming_shop', 'internet_cafe', 'other'
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  national_id TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Merchants table (approved merchants)
CREATE TABLE public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  merchant_code TEXT NOT NULL UNIQUE, -- Unique merchant code for identification
  balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_earnings NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 2.00, -- Percentage commission (e.g., 2%)
  merchant_tier TEXT NOT NULL DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Merchant transactions table
CREATE TABLE public.merchant_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'recharge', 'gift_card_purchase', 'commission_earned', 'balance_topup', 'withdrawal'
  customer_phone TEXT, -- For direct recharges
  customer_user_id UUID REFERENCES auth.users(id),
  amount NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add merchant reference to gift_cards table
ALTER TABLE public.gift_cards
ADD COLUMN generated_by_merchant_id UUID REFERENCES public.merchants(id),
ADD COLUMN merchant_purchase_price NUMERIC(10,2), -- Price merchant paid
ADD COLUMN merchant_commission NUMERIC(10,2); -- Commission merchant earned

-- Enable RLS
ALTER TABLE public.merchant_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for merchant_requests
CREATE POLICY "Users can create their own merchant requests"
  ON public.merchant_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own merchant requests"
  ON public.merchant_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all merchant requests"
  ON public.merchant_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update merchant requests"
  ON public.merchant_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for merchants
CREATE POLICY "Merchants can view their own data"
  ON public.merchants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all merchants"
  ON public.merchants FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage merchants"
  ON public.merchants FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for merchant_transactions
CREATE POLICY "Merchants can view their own transactions"
  ON public.merchant_transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.merchants
    WHERE merchants.id = merchant_transactions.merchant_id
    AND merchants.user_id = auth.uid()
  ));

CREATE POLICY "Merchants can create their own transactions"
  ON public.merchant_transactions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.merchants
    WHERE merchants.id = merchant_transactions.merchant_id
    AND merchants.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all merchant transactions"
  ON public.merchant_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Function to generate unique merchant code
CREATE OR REPLACE FUNCTION generate_merchant_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  _code TEXT;
  _exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character code: M + 7 random digits
    _code := 'M' || LPAD(FLOOR(RANDOM() * 10000000)::TEXT, 7, '0');
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM public.merchants WHERE merchant_code = _code) INTO _exists;
    
    EXIT WHEN NOT _exists;
  END LOOP;
  
  RETURN _code;
END;
$$;

-- Function to approve merchant request
CREATE OR REPLACE FUNCTION approve_merchant_request(
  _request_id UUID,
  _admin_id UUID,
  _commission_rate NUMERIC DEFAULT 2.00
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request RECORD;
  _merchant_id UUID;
  _merchant_code TEXT;
BEGIN
  -- Check admin permission
  IF NOT has_role(_admin_id, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get request details
  SELECT * INTO _request
  FROM public.merchant_requests
  WHERE id = _request_id AND status = 'pending';

  IF _request IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Request not found or already processed');
  END IF;

  -- Check if user is already a merchant
  IF EXISTS (SELECT 1 FROM public.merchants WHERE user_id = _request.user_id) THEN
    RETURN json_build_object('success', false, 'error', 'User is already a merchant');
  END IF;

  -- Generate merchant code
  _merchant_code := generate_merchant_code();

  -- Create merchant
  INSERT INTO public.merchants (
    user_id, business_name, business_type, phone, address,
    merchant_code, commission_rate
  ) VALUES (
    _request.user_id, _request.business_name, _request.business_type,
    _request.phone, _request.address, _merchant_code, _commission_rate
  ) RETURNING id INTO _merchant_id;

  -- Update request status
  UPDATE public.merchant_requests
  SET status = 'approved',
      reviewed_by = _admin_id,
      reviewed_at = now()
  WHERE id = _request_id;

  RETURN json_build_object(
    'success', true,
    'merchant_id', _merchant_id,
    'merchant_code', _merchant_code
  );
END;
$$;

-- Function to reject merchant request
CREATE OR REPLACE FUNCTION reject_merchant_request(
  _request_id UUID,
  _admin_id UUID,
  _reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check admin permission
  IF NOT has_role(_admin_id, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Update request status
  UPDATE public.merchant_requests
  SET status = 'rejected',
      reviewed_by = _admin_id,
      reviewed_at = now(),
      rejection_reason = _reason
  WHERE id = _request_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Request not found or already processed');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Function for merchant to recharge customer account
CREATE OR REPLACE FUNCTION merchant_recharge_customer(
  _customer_phone TEXT,
  _amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _merchant_id UUID;
  _merchant RECORD;
  _customer_user_id UUID;
  _commission NUMERIC;
  _total_cost NUMERIC;
BEGIN
  -- Get merchant info
  SELECT * INTO _merchant
  FROM public.merchants
  WHERE user_id = auth.uid() AND is_active = true;

  IF _merchant IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Merchant account not found or inactive');
  END IF;

  -- Validate amount
  IF _amount <= 0 OR _amount > 100000 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  -- Calculate commission and total cost
  _commission := _amount * _merchant.commission_rate / 100;
  _total_cost := _amount - _commission; -- Merchant pays less than face value

  -- Check merchant balance
  IF _merchant.balance < _total_cost THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient merchant balance');
  END IF;

  -- Find customer by phone
  SELECT user_id INTO _customer_user_id
  FROM public.profiles
  WHERE phone = _customer_phone;

  IF _customer_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Deduct from merchant balance
  UPDATE public.merchants
  SET balance = balance - _total_cost,
      total_earnings = total_earnings + _commission,
      updated_at = now()
  WHERE id = _merchant.id;

  -- Add to customer balance (as approved deposit)
  INSERT INTO public.deposits (user_id, amount, payment_method, status, admin_notes, processed_at)
  VALUES (_customer_user_id, _amount, 'merchant_recharge', 'approved', 'Recharged by merchant: ' || _merchant.merchant_code, now());

  -- Recalculate customer balance
  PERFORM recalculate_user_balance(_customer_user_id);

  -- Record transaction
  INSERT INTO public.merchant_transactions (
    merchant_id, transaction_type, customer_phone, customer_user_id,
    amount, commission_amount, status
  ) VALUES (
    _merchant.id, 'recharge', _customer_phone, _customer_user_id,
    _amount, _commission, 'completed'
  );

  RETURN json_build_object(
    'success', true,
    'amount', _amount,
    'commission', _commission,
    'cost', _total_cost
  );
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_merchant_requests_updated_at
  BEFORE UPDATE ON public.merchant_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchants_updated_at
  BEFORE UPDATE ON public.merchants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_merchant_requests_user_id ON public.merchant_requests(user_id);
CREATE INDEX idx_merchant_requests_status ON public.merchant_requests(status);
CREATE INDEX idx_merchants_user_id ON public.merchants(user_id);
CREATE INDEX idx_merchants_merchant_code ON public.merchants(merchant_code);
CREATE INDEX idx_merchant_transactions_merchant_id ON public.merchant_transactions(merchant_id);
CREATE INDEX idx_merchant_transactions_created_at ON public.merchant_transactions(created_at DESC);