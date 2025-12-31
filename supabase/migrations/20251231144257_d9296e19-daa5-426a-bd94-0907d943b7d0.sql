
-- Create a function to block fraudulent users and zero their balances
CREATE OR REPLACE FUNCTION public.block_fraudulent_users(
  _user_ids uuid[],
  _admin_id uuid,
  _reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _blocked_count int := 0;
  _balance_zeroed numeric := 0;
  _user_balance numeric;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  FOREACH _user_id IN ARRAY _user_ids LOOP
    -- Get current balance
    SELECT COALESCE(balance, 0) INTO _user_balance
    FROM user_balances WHERE user_id = _user_id;
    
    _balance_zeroed := _balance_zeroed + COALESCE(_user_balance, 0);

    -- Zero out balance
    UPDATE user_balances
    SET balance = 0, updated_at = now()
    WHERE user_id = _user_id;

    -- Deactivate profile
    UPDATE profiles
    SET is_account_activated = false, updated_at = now()
    WHERE user_id = _user_id;

    -- Deactivate merchant if exists
    UPDATE merchants
    SET is_active = false, balance = 0, updated_at = now()
    WHERE user_id = _user_id;

    -- Add to blocked users (upsert)
    INSERT INTO blocked_users (user_id, email, phone, reason, blocked_by)
    SELECT 
      p.user_id,
      p.email,
      p.phone,
      _reason,
      _admin_id
    FROM profiles p
    WHERE p.user_id = _user_id
    ON CONFLICT (user_id) DO UPDATE 
    SET reason = EXCLUDED.reason, 
        blocked_at = now(),
        blocked_by = EXCLUDED.blocked_by;

    -- Reject any pending withdrawals
    UPDATE withdrawals
    SET status = 'rejected',
        admin_notes = 'مرفوض - حساب محظور بسبب احتيال',
        processed_at = now(),
        processed_by = _admin_id
    WHERE user_id = _user_id AND status = 'pending';

    -- Reject any pending deposits
    UPDATE deposits
    SET status = 'rejected',
        admin_notes = 'مرفوض - حساب محظور بسبب احتيال',
        processed_at = now(),
        processed_by = _admin_id
    WHERE user_id = _user_id AND status = 'pending';

    _blocked_count := _blocked_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'blocked_count', _blocked_count,
    'balance_zeroed', _balance_zeroed,
    'message', 'تم حظر ' || _blocked_count || ' مستخدم وتصفير ' || _balance_zeroed || ' دج'
  );
END;
$$;
