-- Fix search path security warning by setting search_path explicitly
CREATE OR REPLACE FUNCTION public.validate_luhn_check_digit(_card_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  n int;
  sum int := 0;
  pos int;
  d int;
BEGIN
  n := length(_card_code);
  IF n < 2 THEN
    RETURN false;
  END IF;
  -- process payload digits from right to left, excluding last check digit
  FOR pos IN 1..(n-1) LOOP
    d := substring(_card_code from n - pos for 1)::int;
    IF (pos % 2) = 1 THEN
      d := d * 2;
      IF d > 9 THEN d := d - 9; END IF;
    END IF;
    sum := sum + d;
  END LOOP;
  RETURN ((sum + substring(_card_code from n for 1)::int) % 10) = 0;
END;
$function$;