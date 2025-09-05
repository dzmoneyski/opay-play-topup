-- Update the redeem_gift_card function to validate check digit
CREATE OR REPLACE FUNCTION public.redeem_gift_card(_card_code text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
  _card_record public.gift_cards%ROWTYPE;
  _card_amount DECIMAL(10,2);
  _lock_until TIMESTAMPTZ;
  _failed_attempts INTEGER;
  _remaining_seconds INTEGER;
  _new_balance DECIMAL(10,2);
  _is_valid_code BOOLEAN;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;

  -- Validate card code format (12 digits with check digit)
  IF LENGTH(_card_code) != 12 OR NOT (_card_code ~ '^[0-9]{12}$') THEN
    RETURN json_build_object('success', false, 'error', 'تنسيق كود البطاقة غير صحيح');
  END IF;

  -- Validate check digit using Luhn algorithm
  _is_valid_code := public.validate_luhn_check_digit(_card_code);
  IF NOT _is_valid_code THEN
    -- Increment failed attempts for invalid check digit
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

    RETURN json_build_object('success', false, 'error', 'كود البطاقة غير صحيح - رقم التحقق خاطئ');
  END IF;

  -- Check lock status
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
$function$

-- Create function to validate Luhn check digit
CREATE OR REPLACE FUNCTION public.validate_luhn_check_digit(_card_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  _digits INTEGER[];
  _sum INTEGER := 0;
  _digit INTEGER;
  _i INTEGER;
  _is_even BOOLEAN;
BEGIN
  -- Convert string to array of digits
  FOR _i IN 1..LENGTH(_card_code) LOOP
    _digits[_i] := SUBSTRING(_card_code, _i, 1)::INTEGER;
  END LOOP;

  -- Calculate Luhn checksum (excluding the check digit itself)
  _is_even := true;
  FOR _i IN REVERSE (ARRAY_LENGTH(_digits, 1) - 1)..1 LOOP
    _digit := _digits[_i];
    
    IF _is_even THEN
      _digit := _digit * 2;
      IF _digit > 9 THEN
        _digit := _digit - 9;
      END IF;
    END IF;
    
    _sum := _sum + _digit;
    _is_even := NOT _is_even;
  END LOOP;

  -- Check if the check digit makes the sum divisible by 10
  RETURN (_sum + _digits[ARRAY_LENGTH(_digits, 1)]) % 10 = 0;
END;
$function$