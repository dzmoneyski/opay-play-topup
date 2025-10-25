-- Update verify_betting_account to create unverified accounts
CREATE OR REPLACE FUNCTION public.verify_betting_account(_platform_id uuid, _player_id text, _promo_code text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
  _account_id UUID;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;

  -- Validate promo code (must be dz21)
  IF _promo_code != 'dz21' THEN
    RETURN json_build_object('success', false, 'error', 'كود البرومو غير صحيح. يجب أن يكون dz21');
  END IF;

  -- Check if account already exists
  SELECT id INTO _account_id
  FROM public.betting_accounts
  WHERE user_id = _user_id 
    AND platform_id = _platform_id 
    AND player_id = _player_id;

  IF _account_id IS NOT NULL THEN
    -- Account already exists - check if verified
    IF EXISTS (SELECT 1 FROM public.betting_accounts WHERE id = _account_id AND is_verified = true) THEN
      RETURN json_build_object('success', true, 'message', 'حسابك محقق مسبقاً');
    ELSE
      RETURN json_build_object('success', true, 'message', 'طلبك قيد المراجعة من قبل المشرف');
    END IF;
  ELSE
    -- Create new UNVERIFIED account - admin will verify it
    INSERT INTO public.betting_accounts (user_id, platform_id, player_id, promo_code, is_verified)
    VALUES (_user_id, _platform_id, _player_id, _promo_code, false)
    RETURNING id INTO _account_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'تم إرسال طلب التحقق. سيتم مراجعته من قبل المشرف',
    'account_id', _account_id
  );
END;
$function$;