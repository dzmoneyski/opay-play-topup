-- Fix admin balance adjustment to bypass all restrictions
-- Admin adjustments should work regardless of holds or pending transactions
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
  _target_user uuid,
  _amount numeric,
  _note text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _admin_id uuid;
  _new_balance numeric;
  _abs_amount numeric;
  _old_balance numeric;
BEGIN
  _admin_id := auth.uid();
  IF _admin_id IS NULL OR NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can adjust balances';
  END IF;

  IF _amount IS NULL OR _amount = 0 THEN
    RAISE EXCEPTION 'Amount must be non-zero';
  END IF;

  -- Get current balance before adjustment
  SELECT balance INTO _old_balance 
  FROM public.user_balances 
  WHERE user_id = _target_user;
  
  -- Ensure balance row exists
  IF _old_balance IS NULL THEN
    INSERT INTO public.user_balances (user_id, balance)
    VALUES (_target_user, 0.00);
    _old_balance := 0.00;
  END IF;

  _abs_amount := ABS(_amount);

  IF _amount > 0 THEN
    -- Adding balance: Record as approved admin deposit
    INSERT INTO public.deposits (user_id, amount, payment_method, status, admin_notes, processed_at, processed_by)
    VALUES (_target_user, _abs_amount, 'admin_adjustment', 'approved', _note, now(), _admin_id);
  ELSE
    -- Deducting balance: Record as completed admin withdrawal
    -- IMPORTANT: Admin can deduct even if user has pending orders
    INSERT INTO public.withdrawals (user_id, amount, withdrawal_method, status, admin_notes, processed_at, processed_by)
    VALUES (_target_user, _abs_amount, 'admin_adjustment', 'completed', _note, now(), _admin_id);
  END IF;

  -- Recalculate authoritative balance
  PERFORM public.recalculate_user_balance(_target_user);

  SELECT balance INTO _new_balance FROM public.user_balances WHERE user_id = _target_user;

  RETURN json_build_object(
    'success', true, 
    'old_balance', _old_balance,
    'adjustment', _amount,
    'new_balance', _new_balance
  );
END;
$$;