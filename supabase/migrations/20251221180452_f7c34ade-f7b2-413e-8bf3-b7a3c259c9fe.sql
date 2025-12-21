
-- تحديث دالة حساب الرصيد لتشمل عمولات التحويلات
CREATE OR REPLACE FUNCTION public.recalculate_user_balance(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _calculated_balance DECIMAL(10,2);
BEGIN
  -- حساب الرصيد من جميع المعاملات
  SELECT COALESCE(
    (
      -- الإيداعات المعتمدة
      (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE user_id = _user_id AND status IN ('approved', 'completed'))
      -- + بطاقات الهدايا المستخدمة
      + (SELECT COALESCE(SUM(amount), 0) FROM gift_cards WHERE used_by = _user_id AND is_used = true)
      -- + التحويلات الواردة
      + (SELECT COALESCE(SUM(amount), 0) FROM transfers WHERE recipient_id = _user_id AND status = 'completed')
      -- - التحويلات الصادرة
      - (SELECT COALESCE(SUM(amount), 0) FROM transfers WHERE sender_id = _user_id AND status = 'completed')
      -- - عمولات التحويلات من platform_ledger
      - (SELECT COALESCE(SUM(fee_amount), 0) FROM platform_ledger WHERE user_id = _user_id AND transaction_type = 'transfer_fee')
      -- - السحوبات (المبلغ + الرسوم) للحالات pending, approved, completed
      - (SELECT COALESCE(SUM(amount + COALESCE(fee_amount, 0)), 0) FROM withdrawals WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed'))
      -- - طلبات البطاقات الرقمية
      - (SELECT COALESCE(SUM(total_dzd), 0) FROM digital_card_orders WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed'))
      -- - طلبات شحن الألعاب
      - (SELECT COALESCE(SUM(amount), 0) FROM game_topup_orders WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed'))
      -- - معاملات المراهنات (الإيداعات)
      - (SELECT COALESCE(SUM(amount), 0) FROM betting_transactions WHERE user_id = _user_id AND transaction_type = 'deposit' AND status IN ('pending', 'approved', 'completed'))
      -- - عمولات إيداعات المراهنات
      - (SELECT COALESCE(SUM(fee_amount), 0) FROM platform_ledger WHERE user_id = _user_id AND transaction_type = 'betting_deposit_fee')
    ), 0
  ) INTO _calculated_balance;
  
  -- تحديث أو إدراج الرصيد
  INSERT INTO user_balances (user_id, balance, updated_at)
  VALUES (_user_id, _calculated_balance, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET balance = _calculated_balance, updated_at = now();
END;
$$;

-- إعادة حساب أرصدة جميع المستخدمين
DO $$
DECLARE
  _user_record RECORD;
  _count INTEGER := 0;
BEGIN
  FOR _user_record IN 
    SELECT DISTINCT user_id FROM user_balances
  LOOP
    PERFORM public.recalculate_user_balance(_user_record.user_id);
    _count := _count + 1;
  END LOOP;
  RAISE NOTICE 'تم إعادة حساب أرصدة % مستخدم', _count;
END;
$$;
