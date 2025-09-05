-- 1) Allow admins to INSERT deposits/withdrawals so admin adjustments are reflected in recalculation
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'deposits' AND policyname = 'Admins can insert deposits'
) THEN
  CREATE POLICY "Admins can insert deposits"
  ON public.deposits
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'withdrawals' AND policyname = 'Admins can insert withdrawals'
) THEN
  CREATE POLICY "Admins can insert withdrawals"
  ON public.withdrawals
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
END IF;
END $$;

-- 2) Atomic admin balance adjustment function: records adjustment and recalculates
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
BEGIN
  _admin_id := auth.uid();
  IF _admin_id IS NULL OR NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can adjust balances';
  END IF;

  IF _amount IS NULL OR _amount = 0 THEN
    RAISE EXCEPTION 'Amount must be non-zero';
  END IF;

  -- Ensure balance row exists
  INSERT INTO public.user_balances (user_id, balance)
  VALUES (_target_user, 0.00)
  ON CONFLICT (user_id) DO NOTHING;

  _abs_amount := ABS(_amount);

  IF _amount > 0 THEN
    -- Record as approved admin deposit so it participates in recalc
    INSERT INTO public.deposits (user_id, amount, payment_method, status, admin_notes, processed_at, processed_by)
    VALUES (_target_user, _abs_amount, 'admin_adjustment', 'approved', _note, now(), _admin_id);
  ELSE
    -- Record as completed admin withdrawal so it is deducted in recalc
    INSERT INTO public.withdrawals (user_id, amount, withdrawal_method, status, admin_notes, processed_at, processed_by)
    VALUES (_target_user, _abs_amount, 'admin_adjustment', 'completed', _note, now(), _admin_id);
  END IF;

  -- Recalculate authoritative balance
  PERFORM public.recalculate_user_balance(_target_user);

  SELECT balance INTO _new_balance FROM public.user_balances WHERE user_id = _target_user;

  RETURN json_build_object('success', true, 'new_balance', _new_balance);
END;
$$;