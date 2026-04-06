
-- Zero out balances of all non-blocked users who redeemed compromised Dec 6 cards
UPDATE user_balances SET balance = 0, updated_at = now()
WHERE user_id IN (
  '812f8f30-dc97-4350-87d2-c9ebc2b41018',
  '3d93abb2-f2b6-433c-aa68-d5ec12b7a5f1',
  '378eb3cd-475b-4e4b-beef-26e6923081aa',
  '07792aa8-51a4-4e86-b75b-f128c58bcbbd',
  'f4107fa2-1f63-4ac0-85c5-b66483015f19',
  '776a8b70-7713-4676-a916-e4a4c9846d62',
  '616e1b6b-0883-4944-bafb-bf76f89c3ba8',
  '11a09d95-a273-4b87-95fd-3ccca6d4a97f',
  'a45836cb-4a83-45e0-903d-c137b19fbb31',
  '72d7bd9f-37c8-43b8-ab31-a1464bd6dda7',
  '412f2796-2c3e-4244-9368-341be2b21c8e',
  'ffedaf55-0ee3-49ec-a7af-2d090a153107',
  '791dc3f2-584a-4f11-972f-a1df441db372',
  '441a3a9f-ea48-441e-8c94-2e1d5e6c2e76',
  '85d59db9-73d7-4c05-9056-09034184559f',
  'a2c5695f-4d92-4253-bb42-93f426881912',
  'db99e82e-ea3b-4fd7-a6e9-115d1e8b3799'
);
