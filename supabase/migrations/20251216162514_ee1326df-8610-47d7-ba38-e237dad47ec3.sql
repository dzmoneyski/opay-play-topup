-- Fix: approving a withdrawal must not fail because the user's balance is already on-hold for the pending withdrawal.
-- This function now finalizes the request and records the fee using stored fee fields (or calculates them if missing).

CREATE OR REPLACE FUNCTION public.approve_withdrawal(
  _admin_id uuid,
  _withdrawal_id uuid,
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _w record;
  _fee_config jsonb;
  _fee_info jsonb;
BEGIN
  -- Ensure caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve withdrawals';
  END IF;

  -- Lock row to avoid double processing
  SELECT * INTO _w
  FROM public.withdrawals
  WHERE id = _withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'طلب السحب غير موجود';
  END IF;

  IF _w.status <> 'pending' THEN
    RAISE EXCEPTION 'طلب السحب تمت معالجته مسبقاً';
  END IF;

  -- Build fee info (prefer stored columns)
  IF _w.fee_amount IS NULL OR _w.net_amount IS NULL THEN
    SELECT setting_value INTO _fee_config
    FROM public.platform_settings
    WHERE setting_key = 'withdrawal_fees';

    _fee_info := public.calculate_fee(_w.amount, _fee_config);

    UPDATE public.withdrawals
    SET fee_amount = COALESCE((_fee_info->>'fee_amount')::numeric, 0),
        net_amount = COALESCE((_fee_info->>'net_amount')::numeric, _w.amount),
        fee_percentage = COALESCE((_fee_info->>'fee_percentage')::numeric, 0),
        fee_fixed = COALESCE((_fee_info->>'fee_fixed')::numeric, 0),
        updated_at = now()
    WHERE id = _withdrawal_id;
  ELSE
    _fee_info := jsonb_build_object(
      'fee_amount', COALESCE(_w.fee_amount, 0),
      'net_amount', COALESCE(_w.net_amount, _w.amount),
      'fee_percentage', COALESCE(_w.fee_percentage, 0),
      'fee_fixed', COALESCE(_w.fee_fixed, 0)
    );
  END IF;

  -- Record platform revenue for the withdrawal fee at approval time
  PERFORM public.record_platform_revenue('withdrawal_fee', _withdrawal_id, _w.user_id, _fee_info, _w.amount);

  -- Finalize withdrawal
  UPDATE public.withdrawals
  SET status = 'completed',
      processed_at = now(),
      processed_by = _admin_id,
      admin_notes = _notes,
      updated_at = now()
  WHERE id = _withdrawal_id;

  -- Recalculate to persist final state
  PERFORM public.recalculate_user_balance(_w.user_id);
END;
$$;