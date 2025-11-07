-- Create function to process game top-up orders with balance deduction
CREATE OR REPLACE FUNCTION public.process_game_topup_order(
  _platform_id UUID,
  _package_id UUID,
  _player_id TEXT,
  _amount NUMERIC,
  _notes TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _user_id UUID;
  _current_balance NUMERIC;
  _order_id UUID;
  _fee_config JSONB;
  _fee_info JSONB;
  _total_deducted NUMERIC;
  _is_activated BOOLEAN;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;

  -- Validate amount
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ غير صحيح');
  END IF;

  -- Check if account is activated
  SELECT is_account_activated INTO _is_activated
  FROM public.profiles
  WHERE user_id = _user_id;
  
  IF NOT COALESCE(_is_activated, false) THEN
    RETURN json_build_object('success', false, 'error', 'يجب تفعيل حسابك أولاً');
  END IF;

  -- Get game top-up fee configuration
  SELECT setting_value INTO _fee_config
  FROM public.platform_settings
  WHERE setting_key = 'game_topup_fees';
  
  -- If no fee config exists, use default (no fees)
  IF _fee_config IS NULL THEN
    _fee_config := jsonb_build_object('enabled', false);
  END IF;
  
  -- Calculate fees
  _fee_info := public.calculate_fee(_amount, _fee_config);
  _total_deducted := _amount + (_fee_info->>'fee_amount')::NUMERIC;

  -- Recalculate balance to ensure it's fresh
  PERFORM public.recalculate_user_balance(_user_id);

  -- Check balance (user must have enough balance for amount + fees)
  SELECT balance INTO _current_balance
  FROM public.user_balances
  WHERE user_id = _user_id;

  IF COALESCE(_current_balance, 0) < _total_deducted THEN
    RETURN json_build_object('success', false, 'error', 'الرصيد غير كافي (بما في ذلك العمولة)');
  END IF;

  -- Create PENDING order
  INSERT INTO public.game_topup_orders (
    user_id, platform_id, package_id, player_id, amount, status, notes
  ) VALUES (
    _user_id, _platform_id, _package_id, _player_id, _amount, 'pending', _notes
  ) RETURNING id INTO _order_id;

  -- Deduct balance immediately (amount + fees)
  UPDATE public.user_balances
  SET balance = balance - _total_deducted,
      updated_at = now()
  WHERE user_id = _user_id;

  -- Record platform revenue
  PERFORM public.record_platform_revenue('game_topup_fee', _order_id, _user_id, _fee_info, _amount);

  RETURN json_build_object(
    'success', true,
    'message', 'تم خصم المبلغ وإرسال الطلب للمشرف',
    'order_id', _order_id,
    'fee_amount', (_fee_info->>'fee_amount')::NUMERIC,
    'total_deducted', _total_deducted
  );
END;
$function$;

-- Create function to approve game top-up orders
CREATE OR REPLACE FUNCTION public.approve_game_topup_order(
  _order_id UUID,
  _admin_notes TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _user_id UUID;
  _amount NUMERIC;
BEGIN
  -- Get order details
  SELECT user_id, amount INTO _user_id, _amount
  FROM public.game_topup_orders
  WHERE id = _order_id AND status = 'pending';

  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'الطلب غير موجود أو تمت معالجته مسبقاً');
  END IF;

  -- Update order status (amount already deducted)
  UPDATE public.game_topup_orders
  SET status = 'completed',
      processed_at = now(),
      processed_by = auth.uid(),
      admin_notes = _admin_notes
  WHERE id = _order_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تمت الموافقة على الطلب بنجاح'
  );
END;
$function$;

-- Create function to reject game top-up orders and refund
CREATE OR REPLACE FUNCTION public.reject_game_topup_order(
  _order_id UUID,
  _admin_notes TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _user_id UUID;
  _amount NUMERIC;
  _fee_amount NUMERIC;
BEGIN
  -- Get order details
  SELECT user_id, amount INTO _user_id, _amount
  FROM public.game_topup_orders
  WHERE id = _order_id AND status = 'pending';

  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'الطلب غير موجود أو تمت معالجته مسبقاً');
  END IF;

  -- Get the fee that was charged from platform_ledger
  SELECT fee_amount INTO _fee_amount
  FROM public.platform_ledger
  WHERE transaction_id = _order_id AND transaction_type = 'game_topup_fee';

  -- Update order status
  UPDATE public.game_topup_orders
  SET status = 'rejected',
      processed_at = now(),
      processed_by = auth.uid(),
      admin_notes = _admin_notes
  WHERE id = _order_id;

  -- Refund the full amount (amount + fee)
  UPDATE public.user_balances
  SET balance = balance + _amount + COALESCE(_fee_amount, 0),
      updated_at = now()
  WHERE user_id = _user_id;

  -- Remove the fee from platform_ledger (or mark it as refunded)
  DELETE FROM public.platform_ledger
  WHERE transaction_id = _order_id AND transaction_type = 'game_topup_fee';

  RETURN json_build_object(
    'success', true,
    'message', 'تم رفض الطلب وإرجاع المبلغ بالكامل',
    'refunded_amount', _amount + COALESCE(_fee_amount, 0)
  );
END;
$function$;

-- Create trigger to update balance on game topup order changes
CREATE OR REPLACE FUNCTION public.update_balance_on_game_topup_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    PERFORM public.recalculate_user_balance(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS update_balance_on_game_topup_trigger ON public.game_topup_orders;
CREATE TRIGGER update_balance_on_game_topup_trigger
AFTER INSERT OR UPDATE ON public.game_topup_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_balance_on_game_topup_change();