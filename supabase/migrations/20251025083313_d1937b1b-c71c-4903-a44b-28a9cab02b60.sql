-- Create betting accounts verification table
CREATE TABLE public.betting_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform_id UUID NOT NULL REFERENCES public.game_platforms(id),
  player_id TEXT NOT NULL,
  promo_code TEXT NOT NULL DEFAULT 'dz21',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform_id, player_id)
);

-- Create betting transactions table (deposits and withdrawals)
CREATE TABLE public.betting_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform_id UUID NOT NULL REFERENCES public.game_platforms(id),
  player_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  withdrawal_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.betting_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.betting_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for betting_accounts
CREATE POLICY "Users can view their own betting accounts"
  ON public.betting_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own betting accounts"
  ON public.betting_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all betting accounts"
  ON public.betting_accounts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update betting accounts"
  ON public.betting_accounts FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for betting_transactions
CREATE POLICY "Users can view their own betting transactions"
  ON public.betting_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own betting transactions"
  ON public.betting_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all betting transactions"
  ON public.betting_transactions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update betting transactions"
  ON public.betting_transactions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_betting_accounts_updated_at
  BEFORE UPDATE ON public.betting_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_betting_transactions_updated_at
  BEFORE UPDATE ON public.betting_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to verify betting account
CREATE OR REPLACE FUNCTION public.verify_betting_account(
  _platform_id UUID,
  _player_id TEXT,
  _promo_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _account_id UUID;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;

  -- Validate promo code
  IF _promo_code != 'dz21' THEN
    RETURN json_build_object('success', false, 'error', 'كود البرومو غير صحيح');
  END IF;

  -- Check if account already exists
  SELECT id INTO _account_id
  FROM public.betting_accounts
  WHERE user_id = _user_id 
    AND platform_id = _platform_id 
    AND player_id = _player_id;

  IF _account_id IS NOT NULL THEN
    -- Update existing account
    UPDATE public.betting_accounts
    SET is_verified = true,
        verified_at = now(),
        updated_at = now()
    WHERE id = _account_id;
  ELSE
    -- Create new verified account
    INSERT INTO public.betting_accounts (user_id, platform_id, player_id, promo_code, is_verified, verified_at)
    VALUES (_user_id, _platform_id, _player_id, _promo_code, true, now())
    RETURNING id INTO _account_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'تم التحقق من حسابك بنجاح',
    'account_id', _account_id
  );
END;
$$;

-- Function to process betting deposit
CREATE OR REPLACE FUNCTION public.process_betting_deposit(
  _platform_id UUID,
  _player_id TEXT,
  _amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _current_balance NUMERIC;
  _fee_config JSONB;
  _fee_info JSONB;
  _total_deducted NUMERIC;
  _transaction_id UUID;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;

  -- Validate amount
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ غير صحيح');
  END IF;

  -- Check if account is verified
  IF NOT EXISTS (
    SELECT 1 FROM public.betting_accounts
    WHERE user_id = _user_id 
      AND platform_id = _platform_id 
      AND player_id = _player_id
      AND is_verified = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'الحساب غير موثق');
  END IF;

  -- Get deposit fee configuration
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'deposit_fees';
  
  -- Calculate fees
  _fee_info := public.calculate_fee(_amount, _fee_config);
  _total_deducted := _amount + (_fee_info->>'fee_amount')::NUMERIC;

  -- Check balance
  SELECT balance INTO _current_balance
  FROM public.user_balances
  WHERE user_id = _user_id;

  IF COALESCE(_current_balance, 0) < _total_deducted THEN
    RETURN json_build_object('success', false, 'error', 'الرصيد غير كافي');
  END IF;

  -- Create transaction
  INSERT INTO public.betting_transactions (
    user_id, platform_id, player_id, transaction_type, amount, status
  ) VALUES (
    _user_id, _platform_id, _player_id, 'deposit', _amount, 'completed'
  ) RETURNING id INTO _transaction_id;

  -- Deduct from balance
  UPDATE public.user_balances
  SET balance = balance - _total_deducted,
      updated_at = now()
  WHERE user_id = _user_id;

  -- Record platform revenue
  PERFORM public.record_platform_revenue('betting_deposit_fee', _transaction_id, _user_id, _fee_info, _amount);

  RETURN json_build_object(
    'success', true,
    'message', 'تم الإيداع بنجاح',
    'transaction_id', _transaction_id,
    'fee_amount', (_fee_info->>'fee_amount')::NUMERIC,
    'total_deducted', _total_deducted
  );
END;
$$;