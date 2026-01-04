
-- تحديث دالة حساب الإنفاق اليومي لتشمل الطلبات المكتملة
CREATE OR REPLACE FUNCTION public.get_user_daily_spending(_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total_spending numeric := 0;
  _withdrawals numeric := 0;
  _digital_cards numeric := 0;
  _game_topups numeric := 0;
  _betting_deposits numeric := 0;
  _phone_topups numeric := 0;
BEGIN
  -- حساب السحوبات اليومية (pending + approved + completed)
  SELECT COALESCE(SUM(amount), 0) INTO _withdrawals
  FROM withdrawals
  WHERE user_id = _user_id
    AND status IN ('pending', 'approved', 'completed')
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  -- حساب طلبات البطاقات الرقمية اليومية
  SELECT COALESCE(SUM(total_dzd), 0) INTO _digital_cards
  FROM digital_card_orders
  WHERE user_id = _user_id
    AND status IN ('pending', 'approved', 'completed')
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  -- حساب طلبات شحن الألعاب اليومية
  SELECT COALESCE(SUM(amount), 0) INTO _game_topups
  FROM game_topup_orders
  WHERE user_id = _user_id
    AND status IN ('pending', 'approved', 'completed')
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  -- حساب إيداعات المراهنات اليومية
  SELECT COALESCE(SUM(amount), 0) INTO _betting_deposits
  FROM betting_transactions
  WHERE user_id = _user_id
    AND transaction_type = 'deposit'
    AND status IN ('pending', 'approved', 'completed')
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  -- حساب شحن الهاتف اليومي
  SELECT COALESCE(SUM(amount), 0) INTO _phone_topups
  FROM phone_topup_orders
  WHERE user_id = _user_id
    AND status IN ('pending', 'approved', 'completed')
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  _total_spending := _withdrawals + _digital_cards + _game_topups + _betting_deposits + _phone_topups;
  
  RETURN _total_spending;
END;
$$;
