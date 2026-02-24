
-- Create function to call telegram-notify edge function via pg_net
CREATE OR REPLACE FUNCTION public.notify_telegram()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _type TEXT;
  _payload JSONB;
  _supabase_url TEXT := 'https://zxnwixjdwimfblcwfkgo.supabase.co';
  _service_key TEXT;
BEGIN
  -- Determine notification type
  IF TG_TABLE_NAME = 'fraud_attempts' THEN
    _type := 'fraud_attempt';
    _payload := jsonb_build_object(
      'type', _type,
      'record', jsonb_build_object(
        'attempt_type', NEW.attempt_type,
        'user_id', NEW.user_id,
        'details', NEW.details,
        'ip_address', NEW.ip_address
      )
    );
  ELSIF TG_TABLE_NAME = 'withdrawals' THEN
    _type := 'new_withdrawal';
    _payload := jsonb_build_object(
      'type', _type,
      'record', jsonb_build_object(
        'amount', NEW.amount,
        'user_id', NEW.user_id,
        'withdrawal_method', NEW.withdrawal_method
      )
    );
  ELSIF TG_TABLE_NAME = 'deposits' THEN
    _type := 'new_deposit';
    _payload := jsonb_build_object(
      'type', _type,
      'record', jsonb_build_object(
        'amount', NEW.amount,
        'user_id', NEW.user_id,
        'payment_method', NEW.payment_method
      )
    );
  END IF;

  -- Call edge function via pg_net
  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/telegram-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1)
    ),
    body := _payload
  );

  RETURN NEW;
END;
$$;

-- Trigger on fraud_attempts (INSERT)
DROP TRIGGER IF EXISTS trigger_telegram_fraud ON public.fraud_attempts;
CREATE TRIGGER trigger_telegram_fraud
  AFTER INSERT ON public.fraud_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram();

-- Trigger on withdrawals (INSERT)
DROP TRIGGER IF EXISTS trigger_telegram_withdrawal ON public.withdrawals;
CREATE TRIGGER trigger_telegram_withdrawal
  AFTER INSERT ON public.withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram();

-- Trigger on deposits (INSERT)
DROP TRIGGER IF EXISTS trigger_telegram_deposit ON public.deposits;
CREATE TRIGGER trigger_telegram_deposit
  AFTER INSERT ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram();
