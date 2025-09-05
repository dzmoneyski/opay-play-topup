-- Update balance calculation to include redeemed gift cards and avoid overwrites
CREATE OR REPLACE FUNCTION public.recalculate_user_balance(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _total_approved DECIMAL(10,2);
  _total_sent DECIMAL(10,2);
  _total_received DECIMAL(10,2);
  _total_withdrawal_holds DECIMAL(10,2);
  _total_gift_cards DECIMAL(10,2);
  _final_balance DECIMAL(10,2);
BEGIN
  -- Total approved deposits
  SELECT COALESCE(SUM(amount), 0.00) INTO _total_approved
  FROM public.deposits 
  WHERE user_id = _user_id AND status = 'approved';
  
  -- Total sent transfers
  SELECT COALESCE(SUM(amount), 0.00) INTO _total_sent
  FROM public.transfers 
  WHERE sender_id = _user_id AND status = 'completed';
  
  -- Total received transfers
  SELECT COALESCE(SUM(amount), 0.00) INTO _total_received
  FROM public.transfers 
  WHERE recipient_id = _user_id AND status = 'completed';

  -- Total withdrawal holds (pending/approved/completed are considered held)
  SELECT COALESCE(SUM(amount), 0.00) INTO _total_withdrawal_holds
  FROM public.withdrawals
  WHERE user_id = _user_id AND status IN ('pending','approved','completed');

  -- Total redeemed gift cards
  SELECT COALESCE(SUM(amount), 0.00) INTO _total_gift_cards
  FROM public.gift_cards
  WHERE used_by = _user_id;
  
  -- Final available balance now includes gift cards
  _final_balance := _total_approved + _total_received + _total_gift_cards - _total_sent - _total_withdrawal_holds;
  
  -- Upsert user's balance
  INSERT INTO public.user_balances (user_id, balance)
  VALUES (_user_id, _final_balance)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = EXCLUDED.balance,
    updated_at = now();
END;
$function$;

-- Adjust redeem function to rely on recalc only (avoid double credit)
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