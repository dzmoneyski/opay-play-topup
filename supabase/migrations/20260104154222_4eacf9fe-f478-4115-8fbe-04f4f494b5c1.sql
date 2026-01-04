
-- Drop and recreate the function
DROP FUNCTION IF EXISTS public.approve_withdrawal(uuid, uuid, text);

CREATE FUNCTION public.approve_withdrawal(
  _withdrawal_id UUID,
  _admin_id UUID,
  _notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _w record;
  _fee_config jsonb;
  _fee_info jsonb;
  _fee_already_recorded BOOLEAN;
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

  -- Check if fee already recorded to avoid double-charging
  SELECT EXISTS(
    SELECT 1 FROM public.platform_ledger 
    WHERE transaction_id = _withdrawal_id 
    AND transaction_type = 'withdrawal_fee'
  ) INTO _fee_already_recorded;

  -- Only record platform revenue if not already recorded
  IF NOT _fee_already_recorded THEN
    PERFORM public.record_platform_revenue('withdrawal_fee', _withdrawal_id, _w.user_id, _fee_info, _w.amount);
  END IF;

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
