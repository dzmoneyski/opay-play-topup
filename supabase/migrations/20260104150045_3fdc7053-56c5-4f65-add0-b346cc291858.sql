
-- Delete the two pending fraudulent orders without refund
DELETE FROM game_topup_orders 
WHERE id IN (
  'de5af10a-a8cc-462f-9e1a-10018995f686',
  '8e04a56e-0862-40dc-8b35-f90497893aa8'
);

-- Log this as a fraud attempt
INSERT INTO fraud_attempts (user_id, attempt_type, ip_address, details)
VALUES (
  'd81a8258-2852-47cf-b493-dde962d70388',
  'duplicate_orders',
  NULL,
  '{"description": "User created 2 orders within 18 seconds to exploit the system", "orders_deleted": ["de5af10a-a8cc-462f-9e1a-10018995f686", "8e04a56e-0862-40dc-8b35-f90497893aa8"], "amount_per_order": 350}'::jsonb
);
