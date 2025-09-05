-- Fix redeem_gift_card to properly credit balance
CREATE OR REPLACE FUNCTION public.redeem_gift_card(_card_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _user_id UUID;
  _card_record public.gift_cards%ROWTYPE;
  _card_amount DECIMAL(10,2);
  _lock_until TIMESTAMPTZ;
  _failed_attempts INTEGER;
  _remaining_seconds INTEGER;
  _current_balance DECIMAL(10,2);
  _new_balance DECIMAL(10,2);
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
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

  -- Get current balance before adding
  SELECT COALESCE(balance, 0) INTO _current_balance 
  FROM public.user_balances 
  WHERE user_id = _user_id;

  -- Mark card as used FIRST
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

  -- Credit balance - ensure we ADD to existing balance
  INSERT INTO public.user_balances (user_id, balance, created_at, updated_at)
  VALUES (_user_id, _card_amount, now(), now())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    balance = user_balances.balance + _card_amount,
    updated_at = now();

  -- Get new balance to confirm
  SELECT balance INTO _new_balance 
  FROM public.user_balances 
  WHERE user_id = _user_id;

  -- Recalculate for accuracy
  PERFORM public.recalculate_user_balance(_user_id);

  -- Get final balance after recalculation
  SELECT balance INTO _new_balance 
  FROM public.user_balances 
  WHERE user_id = _user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تم تعمير حسابك بنجاح',
    'amount', _card_amount,
    'previous_balance', _current_balance,
    'new_balance', _new_balance,
    'card_code', _card_code
  );
END;
$$;