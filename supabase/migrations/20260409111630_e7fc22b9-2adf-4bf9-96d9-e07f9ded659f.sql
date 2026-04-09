-- Drop telegram notification triggers that use pg_net (which is not enabled)
-- Client-side notification via edge function is already in place

DROP TRIGGER IF EXISTS trigger_telegram_withdrawal ON public.withdrawals;
DROP TRIGGER IF EXISTS trigger_telegram_deposit ON public.deposits;
DROP TRIGGER IF EXISTS trigger_telegram_fraud ON public.fraud_attempts;

-- Drop the function since it's no longer used
DROP FUNCTION IF EXISTS public.notify_telegram();