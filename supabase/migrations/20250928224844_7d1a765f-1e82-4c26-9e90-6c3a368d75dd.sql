-- Clear all user data and reset database to zero
-- Delete all records from user-related tables

-- Clear financial data
DELETE FROM public.platform_ledger;
DELETE FROM public.user_balances;
DELETE FROM public.withdrawals;
DELETE FROM public.deposits;
DELETE FROM public.transfers;
DELETE FROM public.gift_cards;

-- Clear user verification and profile data  
DELETE FROM public.verification_requests;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;

-- Note: Keeping platform_settings as they contain configuration data
-- Note: Cannot delete from auth.users as it's managed by Supabase