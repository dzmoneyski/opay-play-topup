
-- Delete transfers between 0663479919 and the fraudster account 0555111252
DELETE FROM transfers 
WHERE (sender_phone = '0555111252' AND recipient_phone = '0663479919')
   OR (sender_phone = '0663479919' AND recipient_phone = '0555111252');
