-- First fix all negative balances to zero
UPDATE user_balances 
SET balance = 0, updated_at = now()
WHERE balance < 0;

-- Now add the constraint to prevent negative balance
ALTER TABLE user_balances DROP CONSTRAINT IF EXISTS balance_non_negative;
ALTER TABLE user_balances ADD CONSTRAINT balance_non_negative CHECK (balance >= 0);