-- Security hardening: set immutable search_path for functions flagged by the linter.

CREATE OR REPLACE FUNCTION public.calculate_withdrawal_fee_percentage(_active_referrals integer)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  IF _active_referrals >= 100 THEN
    RETURN 0; -- 100% withdrawal (no fee)
  ELSIF _active_referrals >= 50 THEN
    RETURN 50; -- 50% fee (can withdraw 50%)
  ELSIF _active_referrals >= 20 THEN
    RETURN 80; -- 80% fee (can withdraw 20%)
  ELSE
    RETURN 100; -- Cannot withdraw yet
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_card_delivery_orders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_digital_cards_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_verification_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;