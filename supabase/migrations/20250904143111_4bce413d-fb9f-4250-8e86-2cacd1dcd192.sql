-- Update approve_deposit function to accept amount adjustment
CREATE OR REPLACE FUNCTION public.approve_deposit(_deposit_id uuid, _admin_id uuid, _notes text DEFAULT NULL::text, _adjusted_amount DECIMAL(10,2) DEFAULT NULL::numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
  _final_amount DECIMAL(10,2);
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve deposits';
  END IF;
  
  -- Get deposit details and update it
  UPDATE public.deposits 
  SET status = 'approved',
      processed_at = now(),
      processed_by = _admin_id,
      admin_notes = _notes,
      amount = COALESCE(_adjusted_amount, amount)
  WHERE id = _deposit_id
  RETURNING user_id, amount INTO _user_id, _final_amount;
  
  -- Here you would typically update user balance
  -- For now, we'll just mark it as approved with the correct amount
END;
$function$