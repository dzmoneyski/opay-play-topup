
-- ========================================
-- تصحيح أرصدة المستخدمين الذين استغلوا الثغرة
-- نخصم فقط ما يمكن خصمه ونسجل المبلغ المدين
-- ========================================

-- 1. موفق انس - رصيده 107.50، مدين 2350 → نخصم 107.50، مدين 2242.50
UPDATE user_balances SET balance = 0, updated_at = now() WHERE user_id = '07d047cf-3ff2-4407-88a4-8cb8a7b4af1f';
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('07d047cf-3ff2-4407-88a4-8cb8a7b4af1f', 'direct_insert_bypass', '{"type": "game_topup", "total_amount": 2350, "deducted": 107.50, "remaining_debt": 2242.50, "warning": "⚠️ تم خصم رصيدك وأنت مدين بـ 2242.50 د.ج. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);

-- 2. oussama boulainine - رصيده 9854216.82، مدين 350
UPDATE user_balances SET balance = balance - 350, updated_at = now() WHERE user_id = '14cce3f6-fe8a-4f71-b9af-06556c6e0a01';
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('14cce3f6-fe8a-4f71-b9af-06556c6e0a01', 'direct_insert_bypass', '{"type": "game_topup", "total_amount": 350, "deducted": 350, "warning": "⚠️ تم خصم المبلغ. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);

-- 3. smahi abdelheq - رصيده 0، مدين 1500
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('19f8fa50-4c7a-427b-a5e0-2d7dd220d5e8', 'direct_insert_bypass', '{"type": "game_topup", "total_amount": 1500, "deducted": 0, "remaining_debt": 1500, "warning": "⚠️ أنت مدين بـ 1500 د.ج. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);

-- 4. ABANE ABDENOUR - رصيده 0، مدين 200
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('1de0dd75-7c0a-4a67-86f7-fc5922eaadd5', 'direct_insert_bypass', '{"type": "game_topup", "total_amount": 200, "deducted": 0, "remaining_debt": 200, "warning": "⚠️ أنت مدين بـ 200 د.ج. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);

-- 5. بن غرابي صليحة - رصيده 285، مدين 350 → نخصم 285، مدين 65
UPDATE user_balances SET balance = 0, updated_at = now() WHERE user_id = '28c740d2-2b8c-48a4-b484-e2fe2bd0d9ec';
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('28c740d2-2b8c-48a4-b484-e2fe2bd0d9ec', 'direct_insert_bypass', '{"type": "game_topup", "total_amount": 350, "deducted": 285, "remaining_debt": 65, "warning": "⚠️ تم خصم رصيدك وأنت مدين بـ 65 د.ج. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);

-- 6. مولاي مبارك - رصيده 0، مدين 350
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('5642d10c-344b-47ec-99fc-923a39746306', 'direct_insert_bypass', '{"type": "game_topup", "total_amount": 350, "deducted": 0, "remaining_debt": 350, "warning": "⚠️ أنت مدين بـ 350 د.ج. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);

-- 7. omar omario - رصيده 0، مدين 1500
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('7e5ef17b-a510-44ed-9abd-240113990685', 'direct_insert_bypass', '{"type": "game_topup", "total_amount": 1500, "deducted": 0, "remaining_debt": 1500, "warning": "⚠️ أنت مدين بـ 1500 د.ج. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);

-- 8. nnnn - رصيده 24000، مدين 350
UPDATE user_balances SET balance = balance - 350, updated_at = now() WHERE user_id = '7e6a2ec6-baa1-4765-88c9-83d090ede76a';
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('7e6a2ec6-baa1-4765-88c9-83d090ede76a', 'direct_insert_bypass', '{"type": "game_topup", "total_amount": 350, "deducted": 350, "warning": "⚠️ تم خصم المبلغ. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);

-- 9. Zakarya benabied - رصيده 40، مدين 350 → نخصم 40، مدين 310
UPDATE user_balances SET balance = 0, updated_at = now() WHERE user_id = '86e71b40-a72d-4810-aa28-067eac5b2dd3';
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('86e71b40-a72d-4810-aa28-067eac5b2dd3', 'direct_insert_bypass', '{"type": "game_topup", "total_amount": 350, "deducted": 40, "remaining_debt": 310, "warning": "⚠️ تم خصم رصيدك وأنت مدين بـ 310 د.ج. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);

-- 10. عماد سلموني - رصيده 140، مدين 350 → نخصم 140، مدين 210
UPDATE user_balances SET balance = 0, updated_at = now() WHERE user_id = 'c6cb36d3-5666-4084-9d99-59d610caf03a';
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('c6cb36d3-5666-4084-9d99-59d610caf03a', 'direct_insert_bypass', '{"type": "game_topup", "total_amount": 350, "deducted": 140, "remaining_debt": 210, "warning": "⚠️ تم خصم رصيدك وأنت مدين بـ 210 د.ج. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);

-- 11. Boulahouadjeb Athmane - رصيده 490، مدين 350
UPDATE user_balances SET balance = balance - 350, updated_at = now() WHERE user_id = 'e9703e86-d0c2-4d5a-8567-1ad38126f48c';
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('e9703e86-d0c2-4d5a-8567-1ad38126f48c', 'direct_insert_bypass', '{"type": "game_topup", "total_amount": 350, "deducted": 350, "warning": "⚠️ تم خصم المبلغ. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);

-- طلبات الهاتف
-- 12. Islam Tebbakh - رصيده 185، مدين 100
UPDATE user_balances SET balance = balance - 100, updated_at = now() WHERE user_id = '026bb1f9-3e44-4705-9797-c17d0b37bf58';
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('026bb1f9-3e44-4705-9797-c17d0b37bf58', 'direct_insert_bypass', '{"type": "phone_topup", "total_amount": 100, "deducted": 100, "warning": "⚠️ تم خصم المبلغ. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);

-- 13. Samy saieb - رصيده 1500، مدين 4200 → نخصم 1500، مدين 2700
UPDATE user_balances SET balance = 0, updated_at = now() WHERE user_id = '3b400324-e7e1-4653-84a1-05eca73cc86c';
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('3b400324-e7e1-4653-84a1-05eca73cc86c', 'direct_insert_bypass', '{"type": "phone_topup", "total_amount": 4200, "deducted": 1500, "remaining_debt": 2700, "warning": "⚠️ تم خصم رصيدك وأنت مدين بـ 2700 د.ج. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);

-- 14. Abdoun abdelouahab - رصيده 4000، مدين 1000
UPDATE user_balances SET balance = balance - 1000, updated_at = now() WHERE user_id = '3d7e1651-1aba-4c36-af40-0be9d80c0415';
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('3d7e1651-1aba-4c36-af40-0be9d80c0415', 'direct_insert_bypass', '{"type": "phone_topup", "total_amount": 1000, "deducted": 1000, "warning": "⚠️ تم خصم المبلغ. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);

-- 15. Ben smara Moussa - رصيده 1000، مدين 2850 → نخصم 1000، مدين 1850
UPDATE user_balances SET balance = 0, updated_at = now() WHERE user_id = '5257079e-d9d9-4fdc-ad77-9da5bb056b80';
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('5257079e-d9d9-4fdc-ad77-9da5bb056b80', 'direct_insert_bypass', '{"type": "phone_topup", "total_amount": 2850, "deducted": 1000, "remaining_debt": 1850, "warning": "⚠️ تم خصم رصيدك وأنت مدين بـ 1850 د.ج. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);

-- 16. امين محلي - رصيده 1040، مدين 800
UPDATE user_balances SET balance = balance - 800, updated_at = now() WHERE user_id = '7b0eecd8-a319-4256-8fd3-db40bf137e13';
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('7b0eecd8-a319-4256-8fd3-db40bf137e13', 'direct_insert_bypass', '{"type": "phone_topup", "total_amount": 800, "deducted": 800, "warning": "⚠️ تم خصم المبلغ. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);

-- 17. Azzedine khechai - رصيده 1148.50، مدين 100
UPDATE user_balances SET balance = balance - 100, updated_at = now() WHERE user_id = '812f8f30-dc97-4350-87d2-c9ebc2b41018';
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('812f8f30-dc97-4350-87d2-c9ebc2b41018', 'direct_insert_bypass', '{"type": "phone_topup", "total_amount": 100, "deducted": 100, "warning": "⚠️ تم خصم المبلغ. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);

-- 18. Djamel chebli - رصيده 110، مدين 110
UPDATE user_balances SET balance = 0, updated_at = now() WHERE user_id = '8c9ad4ae-6cc2-4ba8-9167-5bc5e14ef453';
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('8c9ad4ae-6cc2-4ba8-9167-5bc5e14ef453', 'direct_insert_bypass', '{"type": "phone_topup", "total_amount": 110, "deducted": 110, "warning": "⚠️ تم خصم المبلغ. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);

-- 19. BOUKHETACHE KHEIR EDDINE - رصيده 6000، مدين 200
UPDATE user_balances SET balance = balance - 200, updated_at = now() WHERE user_id = 'b5497311-8ca5-496a-8c1b-5d3dc9322b3e';
INSERT INTO fraud_attempts (user_id, attempt_type, details) VALUES ('b5497311-8ca5-496a-8c1b-5d3dc9322b3e', 'direct_insert_bypass', '{"type": "phone_topup", "total_amount": 200, "deducted": 200, "warning": "⚠️ تم خصم المبلغ. أي محاولة احتيال مستقبلية ستؤدي لحظر حسابك نهائياً"}'::jsonb);
