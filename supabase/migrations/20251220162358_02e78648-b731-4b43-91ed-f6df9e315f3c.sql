
-- Create validation trigger to prevent zero fee orders
CREATE OR REPLACE FUNCTION public.validate_digital_card_order_fee()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure fee_amount is greater than 0 for new orders
  IF NEW.fee_amount IS NULL OR NEW.fee_amount <= 0 THEN
    RAISE EXCEPTION 'لا يمكن إنشاء طلب بدون عمولة. fee_amount يجب أن يكون أكبر من صفر';
  END IF;
  
  -- Ensure total_dzd includes the fee
  IF NEW.total_dzd IS NULL OR NEW.total_dzd < NEW.fee_amount THEN
    RAISE EXCEPTION 'المبلغ الإجمالي غير صحيح. يجب أن يشمل العمولة';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for INSERT only (not UPDATE to allow admin corrections)
DROP TRIGGER IF EXISTS validate_digital_card_order_fee_trigger ON public.digital_card_orders;
CREATE TRIGGER validate_digital_card_order_fee_trigger
  BEFORE INSERT ON public.digital_card_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_digital_card_order_fee();

-- Also add a similar check for game_topup_orders to be consistent
CREATE OR REPLACE FUNCTION public.validate_game_topup_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure amount is greater than 0
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'المبلغ يجب أن يكون أكبر من صفر';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS validate_game_topup_order_trigger ON public.game_topup_orders;
CREATE TRIGGER validate_game_topup_order_trigger
  BEFORE INSERT ON public.game_topup_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_game_topup_order();
