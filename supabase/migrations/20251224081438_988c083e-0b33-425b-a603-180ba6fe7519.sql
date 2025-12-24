-- Update old withdrawals that have no fees calculated
-- Fee settings: 1.5% + 20 DZD fixed, min: 20, max: 1000

UPDATE withdrawals
SET 
  fee_percentage = 1.5,
  fee_fixed = 20,
  fee_amount = LEAST(GREATEST((amount * 1.5 / 100) + 20, 20), 1000),
  net_amount = amount - LEAST(GREATEST((amount * 1.5 / 100) + 20, 20), 1000)
WHERE (fee_amount = 0 OR fee_amount IS NULL) 
  AND amount > 0
  AND status != 'rejected';