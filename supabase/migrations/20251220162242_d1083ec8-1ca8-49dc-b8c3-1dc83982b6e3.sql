
-- Fix the 3 orders that have 0 fee amount

-- Order 1: aymenphone83@gmail.com - $30, expected fee: 151.20 DZD
UPDATE public.digital_card_orders
SET fee_amount = 151.20,
    total_dzd = 7560 + 151.20
WHERE id = 'a2d2d010-fc3f-4f86-a4a7-b82c15f2afeb';

UPDATE public.platform_ledger
SET fee_amount = 151.20
WHERE transaction_id = 'a2d2d010-fc3f-4f86-a4a7-b82c15f2afeb' AND transaction_type = 'digital_card_fee';

-- Order 2: oussamatis1992@gmail.com - $25, expected fee: 129.50 DZD
UPDATE public.digital_card_orders
SET fee_amount = 129.50,
    total_dzd = 6475 + 129.50
WHERE id = '1f9ed62e-2662-444f-bfbe-86355b8bde2c';

UPDATE public.platform_ledger
SET fee_amount = 129.50
WHERE transaction_id = '1f9ed62e-2662-444f-bfbe-86355b8bde2c' AND transaction_type = 'digital_card_fee';

-- Order 3: moulaytayeb31@gmail.com - $7.7, expected fee: 38.81 DZD
UPDATE public.digital_card_orders
SET fee_amount = 38.81,
    total_dzd = 1940.40 + 38.81
WHERE id = 'f3a65690-0f2f-4e49-9cf0-d6b0f93a6079';

UPDATE public.platform_ledger
SET fee_amount = 38.81
WHERE transaction_id = 'f3a65690-0f2f-4e49-9cf0-d6b0f93a6079' AND transaction_type = 'digital_card_fee';

-- Recalculate user balances for affected users
SELECT public.recalculate_user_balance('d24f44c0-324f-4580-b4de-51e02496e03a'); -- aymenphone83
SELECT public.recalculate_user_balance('ef59a555-cf75-4313-a183-53255ef6f530'); -- oussamatis1992
SELECT public.recalculate_user_balance('40a96cdd-768d-45a6-85ce-d3e6a49f792c'); -- moulaytayeb31
