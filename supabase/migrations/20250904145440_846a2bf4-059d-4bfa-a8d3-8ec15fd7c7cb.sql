-- Create function to recalculate user balance based on approved deposits
CREATE OR REPLACE FUNCTION public.recalculate_user_balance(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _total_approved DECIMAL(10,2);
BEGIN
  -- Calculate total approved deposits
  SELECT COALESCE(SUM(amount), 0.00) INTO _total_approved
  FROM public.deposits 
  WHERE user_id = _user_id AND status = 'approved';
  
  -- Create or update user balance
  INSERT INTO public.user_balances (user_id, balance)
  VALUES (_user_id, _total_approved)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = _total_approved,
    updated_at = now();
END;
$function$;

-- Create function to recalculate all user balances
CREATE OR REPLACE FUNCTION public.recalculate_all_balances()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_record RECORD;
BEGIN
  FOR _user_record IN 
    SELECT DISTINCT user_id FROM public.deposits WHERE status = 'approved'
  LOOP
    PERFORM public.recalculate_user_balance(_user_record.user_id);
  END LOOP;
END;
$function$;

-- Recalculate all existing balances
SELECT public.recalculate_all_balances();