-- Make deposit-receipts bucket public so receipt images can be viewed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'deposit-receipts';