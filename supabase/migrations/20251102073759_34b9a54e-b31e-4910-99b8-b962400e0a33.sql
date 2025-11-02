-- Create rate limiting table for tracking user operations
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id UUID NOT NULL,
  operation TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, operation)
);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own rate limits
CREATE POLICY "Users can view own rate limits"
ON public.rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own rate limits
CREATE POLICY "Users can insert own rate limits"
ON public.rate_limits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own rate limits
CREATE POLICY "Users can update own rate limits"
ON public.rate_limits
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all rate limits
CREATE POLICY "Admins can view all rate limits"
ON public.rate_limits
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create function to check and update rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id UUID,
  _operation TEXT,
  _max_count INTEGER,
  _window_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_count INTEGER;
  _window_start TIMESTAMPTZ;
BEGIN
  -- Get current rate limit info
  SELECT count, window_start INTO _current_count, _window_start
  FROM public.rate_limits
  WHERE user_id = _user_id AND operation = _operation;
  
  -- If no record exists or window has expired, create/reset
  IF _current_count IS NULL OR _window_start < now() - (_window_minutes || ' minutes')::INTERVAL THEN
    INSERT INTO public.rate_limits (user_id, operation, count, window_start)
    VALUES (_user_id, _operation, 1, now())
    ON CONFLICT (user_id, operation) 
    DO UPDATE SET count = 1, window_start = now();
    RETURN TRUE;
  END IF;
  
  -- Check if limit exceeded
  IF _current_count >= _max_count THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  UPDATE public.rate_limits
  SET count = count + 1
  WHERE user_id = _user_id AND operation = _operation;
  
  RETURN TRUE;
END;
$$;

-- Update process_transfer function with account activation and rate limiting checks
CREATE OR REPLACE FUNCTION public.process_transfer(recipient_phone_param text, amount_param numeric, note_param text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_user_id UUID;
  recipient_user_id UUID;
  sender_balance_record RECORD;
  recipient_balance_record RECORD;
  transfer_id UUID;
  sender_phone_record TEXT;
  _fee_config JSONB;
  _fee_info JSONB;
  _total_deducted NUMERIC;
  _is_activated BOOLEAN;
BEGIN
  -- Get current user
  sender_user_id := auth.uid();
  
  IF sender_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Check if sender account is activated
  SELECT is_account_activated INTO _is_activated
  FROM public.profiles
  WHERE user_id = sender_user_id;
  
  IF NOT COALESCE(_is_activated, false) THEN
    RETURN json_build_object('success', false, 'error', 'يجب تفعيل حسابك أولاً لإجراء التحويلات');
  END IF;

  -- Check rate limit: 10 transfers per hour
  IF NOT check_rate_limit(sender_user_id, 'transfer', 10, 60) THEN
    RETURN json_build_object('success', false, 'error', 'تجاوزت الحد الأقصى للتحويلات. حاول مرة أخرى لاحقاً');
  END IF;

  -- INPUT VALIDATION: Amount must be positive and reasonable (max 1,000,000 DZD)
  IF amount_param IS NULL OR amount_param <= 0 OR amount_param > 1000000 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid amount: must be between 0.01 and 1,000,000 DZD');
  END IF;

  -- INPUT VALIDATION: Phone number format (10-15 digits, may include +)
  IF recipient_phone_param IS NULL OR recipient_phone_param !~ '^[0-9+]{10,15}$' THEN
    RETURN json_build_object('success', false, 'error', 'Invalid phone number format');
  END IF;

  -- INPUT VALIDATION: Note length (max 500 characters)
  IF note_param IS NOT NULL AND LENGTH(note_param) > 500 THEN
    RETURN json_build_object('success', false, 'error', 'Note too long: maximum 500 characters');
  END IF;

  -- Recalculate sender balance to include latest holds
  PERFORM public.recalculate_user_balance(sender_user_id);

  -- Get sender's phone
  SELECT phone INTO sender_phone_record 
  FROM public.profiles 
  WHERE user_id = sender_user_id;

  -- Find recipient by phone
  SELECT user_id INTO recipient_user_id
  FROM public.profiles 
  WHERE phone = recipient_phone_param;
  
  IF recipient_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  IF sender_user_id = recipient_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot transfer to yourself');
  END IF;

  -- Get transfer fee configuration
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'transfer_fees';
  
  -- Calculate fees (sender pays by default)
  _fee_info := public.calculate_fee(amount_param, _fee_config);
  _total_deducted := amount_param + (_fee_info->>'fee_amount')::NUMERIC;

  -- Get sender balance
  SELECT * INTO sender_balance_record 
  FROM public.user_balances 
  WHERE user_id = sender_user_id;
  
  IF sender_balance_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sender balance not found');
  END IF;

  -- Check if sender has enough balance (amount + fees)
  IF sender_balance_record.balance < _total_deducted THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance (including fees)');
  END IF;

  -- Get or create recipient balance
  SELECT * INTO recipient_balance_record 
  FROM public.user_balances 
  WHERE user_id = recipient_user_id;
  
  IF recipient_balance_record IS NULL THEN
    INSERT INTO public.user_balances (user_id, balance)
    VALUES (recipient_user_id, 0)
    RETURNING * INTO recipient_balance_record;
  END IF;

  -- Create transfer record
  INSERT INTO public.transfers (sender_id, recipient_id, sender_phone, recipient_phone, amount, note)
  VALUES (sender_user_id, recipient_user_id, sender_phone_record, recipient_phone_param, amount_param, note_param)
  RETURNING id INTO transfer_id;

  -- Record platform revenue
  PERFORM public.record_platform_revenue('transfer_fee', transfer_id, sender_user_id, _fee_info, amount_param);

  -- Update balances: sender pays amount + fees, recipient receives only amount
  UPDATE public.user_balances 
  SET balance = balance - _total_deducted, updated_at = now()
  WHERE user_id = sender_user_id;

  UPDATE public.user_balances 
  SET balance = balance + amount_param, updated_at = now()
  WHERE user_id = recipient_user_id;

  RETURN json_build_object(
    'success', true, 
    'transfer_id', transfer_id,
    'recipient_id', recipient_user_id,
    'fee_amount', (_fee_info->>'fee_amount')::NUMERIC,
    'total_deducted', _total_deducted
  );
END;
$$;

-- Update redeem_gift_card function with account activation check
CREATE OR REPLACE FUNCTION public.redeem_gift_card(_card_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _card_record public.gift_cards%ROWTYPE;
  _card_amount DECIMAL(10,2);
  _lock_until TIMESTAMPTZ;
  _failed_attempts INTEGER;
  _remaining_seconds INTEGER;
  _new_balance DECIMAL(10,2);
  _is_activated BOOLEAN;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;

  -- Check if account is activated
  SELECT is_account_activated INTO _is_activated
  FROM public.profiles
  WHERE user_id = _user_id;
  
  IF NOT COALESCE(_is_activated, false) THEN
    RETURN json_build_object('success', false, 'error', 'يجب تفعيل حسابك أولاً لتفعيل بطاقات الهدايا');
  END IF;

  -- Check lock status first
  SELECT redeem_locked_until, failed_redeem_attempts
    INTO _lock_until, _failed_attempts
  FROM public.profiles
  WHERE user_id = _user_id;

  IF _lock_until IS NOT NULL AND _lock_until > now() THEN
    _remaining_seconds := EXTRACT(EPOCH FROM (_lock_until - now()));
    RETURN json_build_object(
      'success', false,
      'error', 'تم إيقاف محاولات تفعيل البطاقات مؤقتاً',
      'locked_until', _lock_until,
      'remaining_seconds', _remaining_seconds
    );
  END IF;

  -- Validate card code format (12 digits) and Luhn check digit
  IF LENGTH(_card_code) != 12 OR NOT (_card_code ~ '^[0-9]{12}$') OR NOT public.validate_luhn_check_digit(_card_code) THEN
    UPDATE public.profiles
    SET failed_redeem_attempts = COALESCE(failed_redeem_attempts,0) + 1
    WHERE user_id = _user_id
    RETURNING failed_redeem_attempts INTO _failed_attempts;

    IF _failed_attempts >= 3 THEN
      UPDATE public.profiles
      SET redeem_locked_until = now() + interval '24 hours',
          failed_redeem_attempts = 0
      WHERE user_id = _user_id
      RETURNING redeem_locked_until INTO _lock_until;

      _remaining_seconds := EXTRACT(EPOCH FROM (_lock_until - now()));
      RETURN json_build_object(
        'success', false,
        'error', 'تم إيقاف محاولات تفعيل البطاقات لمدة 24 ساعة بسبب محاولات خاطئة متكررة',
        'locked_until', _lock_until,
        'remaining_seconds', _remaining_seconds
      );
    END IF;

    RETURN json_build_object('success', false, 'error', 'كود البطاقة غير صحيح');
  END IF;

  -- Fetch card
  SELECT * INTO _card_record 
  FROM public.gift_cards 
  WHERE card_code = _card_code;

  -- Invalid or already used
  IF _card_record IS NULL OR _card_record.is_used THEN
    UPDATE public.profiles
    SET failed_redeem_attempts = COALESCE(failed_redeem_attempts,0) + 1
    WHERE user_id = _user_id
    RETURNING failed_redeem_attempts INTO _failed_attempts;

    IF _failed_attempts >= 3 THEN
      UPDATE public.profiles
      SET redeem_locked_until = now() + interval '24 hours',
          failed_redeem_attempts = 0
      WHERE user_id = _user_id
      RETURNING redeem_locked_until INTO _lock_until;

      _remaining_seconds := EXTRACT(EPOCH FROM (_lock_until - now()));
      RETURN json_build_object(
        'success', false,
        'error', 'تم إيقاف محاولات تفعيل البطاقات لمدة 24 ساعة بسبب محاولات خاطئة متكررة',
        'locked_until', _lock_until,
        'remaining_seconds', _remaining_seconds
      );
    END IF;

    IF _card_record IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'كود البطاقة غير صحيح أو غير موجود');
    ELSE
      RETURN json_build_object('success', false, 'error', 'تم استخدام هذه البطاقة من قبل');
    END IF;
  END IF;

  _card_amount := _card_record.amount;

  -- Mark card as used
  UPDATE public.gift_cards 
  SET is_used = TRUE,
      used_by = _user_id,
      used_at = now(),
      updated_at = now()
  WHERE id = _card_record.id;

  -- Reset attempts on success
  UPDATE public.profiles
  SET failed_redeem_attempts = 0,
      redeem_locked_until = NULL
  WHERE user_id = _user_id;

  -- Recalculate to persist final balance including gift cards
  PERFORM public.recalculate_user_balance(_user_id);

  -- Get final balance after recalculation
  SELECT balance INTO _new_balance 
  FROM public.user_balances 
  WHERE user_id = _user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تم تعمير حسابك بنجاح',
    'amount', _card_amount,
    'new_balance', _new_balance,
    'card_code', _card_code
  );
END;
$$;