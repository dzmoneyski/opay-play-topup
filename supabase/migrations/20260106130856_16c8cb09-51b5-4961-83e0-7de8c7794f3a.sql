
-- Create a function to recalculate all user balances
CREATE OR REPLACE FUNCTION public.fix_all_user_balances()
RETURNS TABLE (
  phone TEXT,
  full_name TEXT,
  old_balance NUMERIC,
  new_balance NUMERIC,
  deducted_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user RECORD;
  _old_balance NUMERIC;
  _new_balance NUMERIC;
BEGIN
  FOR _user IN 
    SELECT p.user_id, p.phone, p.full_name, COALESCE(ub.balance, 0) as current_balance
    FROM profiles p
    LEFT JOIN user_balances ub ON p.user_id = ub.user_id
    WHERE ub.balance > 0
  LOOP
    _old_balance := _user.current_balance;
    _new_balance := recalculate_user_balance(_user.user_id);
    
    IF _old_balance != _new_balance THEN
      phone := _user.phone;
      full_name := _user.full_name;
      old_balance := _old_balance;
      new_balance := _new_balance;
      deducted_amount := _old_balance - _new_balance;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- Run the function to fix all balances
SELECT * FROM fix_all_user_balances() ORDER BY deducted_amount DESC;
