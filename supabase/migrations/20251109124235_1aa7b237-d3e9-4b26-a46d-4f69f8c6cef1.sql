-- Make receipts bucket public so images display without auth
UPDATE storage.buckets
SET public = true
WHERE id = 'digital-card-receipts';