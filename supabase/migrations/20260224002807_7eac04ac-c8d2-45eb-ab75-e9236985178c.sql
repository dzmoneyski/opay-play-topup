
-- Add monitoring to redeem_gift_card: log fraud_attempts when a Dec 6 batch card is redeemed
CREATE OR REPLACE FUNCTION public.redeem_gift_card(_card_code TEXT)
RETURNS JSON
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

  -- 🚨 MONITORING: Flag if card is from the compromised Dec 6 batch
  IF _card_record.created_at::date = '2025-12-06' THEN
    INSERT INTO public.fraud_attempts (user_id, attempt_type, details)
    VALUES (
      _user_id,
      'compromised_card_redeemed',
      json_build_object(
        'card_id', _card_record.id,
        'card_code', _card_code,
        'card_amount', _card_amount,
        'alert', 'بطاقة من دفعة 6 ديسمبر المكشوفة - يرجى مراجعة المستخدم'
      )
    );
  END IF;

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
