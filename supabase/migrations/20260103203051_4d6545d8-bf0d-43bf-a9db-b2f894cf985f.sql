
-- إعادة حساب رصيد Ben smara Moussa بشكل صحيح
DO $$
DECLARE
  _user_id uuid := '5257079e-d9d9-4fdc-ad77-9da5bb056b80';
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
      -- - رسوم الإيداع من platform_ledger
      - (SELECT COALESCE(SUM(fee_amount), 0) FROM platform_ledger WHERE user_id = _user_id AND transaction_type = 'deposit_fee')
      -- - السحوبات (المبلغ + الرسوم)
      - (SELECT COALESCE(SUM(amount + COALESCE(fee_amount, 0)), 0) FROM withdrawals WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed'))
      -- - طلبات البطاقات الرقمية
      - (SELECT COALESCE(SUM(total_dzd), 0) FROM digital_card_orders WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed'))
      -- - طلبات شحن الألعاب
      - (SELECT COALESCE(SUM(amount), 0) FROM game_topup_orders WHERE user_id = _user_id AND status IN ('pending', 'approved', 'completed'))
      -- - طلبات شحن الهاتف (المبلغ + الرسوم)
      - (SELECT COALESCE(SUM(p.amount), 0) + COALESCE(SUM(pl.fee_amount), 0) 
         FROM phone_topup_orders p
         LEFT JOIN platform_ledger pl ON pl.transaction_id = p.id AND pl.transaction_type = 'phone_topup'
         WHERE p.user_id = _user_id AND p.status IN ('pending', 'approved', 'completed'))
      -- - معاملات المراهنات (الإيداعات)
      - (SELECT COALESCE(SUM(amount), 0) FROM betting_transactions WHERE user_id = _user_id AND transaction_type = 'deposit' AND status IN ('pending', 'approved', 'completed'))
      -- - عمولات إيداعات المراهنات
      - (SELECT COALESCE(SUM(fee_amount), 0) FROM platform_ledger WHERE user_id = _user_id AND transaction_type = 'betting_deposit_fee')
    ), 0
  ) INTO _calculated_balance;
  
  -- ضمان عدم الرصيد السالب
  IF _calculated_balance < 0 THEN
    _calculated_balance := 0;
  END IF;
  
  -- تحديث الرصيد
  UPDATE user_balances 
  SET balance = _calculated_balance, updated_at = now() 
  WHERE user_id = _user_id;
  
  RAISE NOTICE 'الرصيد الجديد لـ Ben smara Moussa: %', _calculated_balance;
END;
$$;
