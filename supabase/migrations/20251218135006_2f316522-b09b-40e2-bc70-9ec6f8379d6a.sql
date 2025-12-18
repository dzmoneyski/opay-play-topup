
-- Delete all duplicate phone accounts except toumiwasfi25@gmail.com
-- Handle foreign key constraints properly
DO $$
DECLARE
  user_ids_to_delete UUID[];
  user_id_var UUID;
  deleted_count INTEGER := 0;
BEGIN
  -- Get all user IDs to delete
  SELECT ARRAY_AGG(p.user_id) INTO user_ids_to_delete
  FROM public.profiles p
  WHERE p.phone IN (
    SELECT phone FROM public.profiles 
    WHERE phone IS NOT NULL AND phone != ''
    GROUP BY phone HAVING COUNT(*) > 1
  )
  AND p.email != 'toumiwasfi25@gmail.com';

  IF user_ids_to_delete IS NULL OR array_length(user_ids_to_delete, 1) IS NULL THEN
    RAISE NOTICE 'No users to delete';
    RETURN;
  END IF;

  -- Delete from dependent tables first
  DELETE FROM public.account_activation_log WHERE user_id = ANY(user_ids_to_delete);
  DELETE FROM public.account_activation_log WHERE referrer_id = ANY(user_ids_to_delete);
  DELETE FROM public.account_activation_log WHERE activated_by = ANY(user_ids_to_delete);
  
  DELETE FROM public.suspicious_referrals WHERE referrer_id = ANY(user_ids_to_delete);
  DELETE FROM public.suspicious_referrals WHERE referred_user_id = ANY(user_ids_to_delete);
  DELETE FROM public.suspicious_referrals WHERE reviewed_by = ANY(user_ids_to_delete);
  
  DELETE FROM public.referrals WHERE referrer_id = ANY(user_ids_to_delete);
  DELETE FROM public.referrals WHERE referred_user_id = ANY(user_ids_to_delete);
  
  DELETE FROM public.referral_rewards WHERE user_id = ANY(user_ids_to_delete);
  DELETE FROM public.referral_withdrawals WHERE user_id = ANY(user_ids_to_delete);
  DELETE FROM public.referral_codes WHERE user_id = ANY(user_ids_to_delete);
  
  DELETE FROM public.user_balances WHERE user_id = ANY(user_ids_to_delete);
  DELETE FROM public.user_achievements WHERE user_id = ANY(user_ids_to_delete);
  DELETE FROM public.user_roles WHERE user_id = ANY(user_ids_to_delete);
  
  DELETE FROM public.deposits WHERE user_id = ANY(user_ids_to_delete);
  DELETE FROM public.withdrawals WHERE user_id = ANY(user_ids_to_delete);
  DELETE FROM public.transfers WHERE sender_id = ANY(user_ids_to_delete);
  DELETE FROM public.transfers WHERE recipient_id = ANY(user_ids_to_delete);
  
  DELETE FROM public.verification_requests WHERE user_id = ANY(user_ids_to_delete);
  DELETE FROM public.phone_verification_codes WHERE user_id = ANY(user_ids_to_delete);
  DELETE FROM public.rate_limits WHERE user_id = ANY(user_ids_to_delete);
  
  DELETE FROM public.betting_accounts WHERE user_id = ANY(user_ids_to_delete);
  DELETE FROM public.betting_transactions WHERE user_id = ANY(user_ids_to_delete);
  
  DELETE FROM public.digital_card_orders WHERE user_id = ANY(user_ids_to_delete);
  DELETE FROM public.game_topup_orders WHERE user_id = ANY(user_ids_to_delete);
  DELETE FROM public.aliexpress_orders WHERE user_id = ANY(user_ids_to_delete);
  DELETE FROM public.card_delivery_orders WHERE user_id = ANY(user_ids_to_delete);
  DELETE FROM public.diaspora_transfers WHERE sender_id = ANY(user_ids_to_delete);
  
  DELETE FROM public.gift_cards WHERE used_by = ANY(user_ids_to_delete);
  DELETE FROM public.platform_ledger WHERE user_id = ANY(user_ids_to_delete);
  
  DELETE FROM public.merchant_requests WHERE user_id = ANY(user_ids_to_delete);
  
  -- Delete profiles
  DELETE FROM public.profiles WHERE user_id = ANY(user_ids_to_delete);
  
  -- Finally delete from auth.users
  FOREACH user_id_var IN ARRAY user_ids_to_delete
  LOOP
    DELETE FROM auth.users WHERE id = user_id_var;
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Total deleted accounts: %', deleted_count;
END $$;
