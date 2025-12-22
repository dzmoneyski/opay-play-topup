-- Make deposit-receipts bucket public so images can be viewed by admins
UPDATE storage.buckets 
SET public = true 
WHERE id = 'deposit-receipts';