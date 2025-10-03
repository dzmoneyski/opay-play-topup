-- CRITICAL SECURITY FIX: Block all anonymous access to sensitive tables
-- This migration adds default DENY policies for anonymous users and ensures
-- only authenticated users can access data according to proper access controls

-- =============================================================================
-- PROFILES TABLE - Critical: Contains phone numbers, national IDs, personal info
-- =============================================================================

-- Drop all existing SELECT policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create PERMISSIVE policies for authenticated users only
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Explicitly deny anonymous access
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- =============================================================================
-- USER_BALANCES TABLE - Critical: Contains financial information
-- =============================================================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view their own balance" ON public.user_balances;
DROP POLICY IF EXISTS "Admins can view all balances" ON public.user_balances;

-- Create PERMISSIVE policies for authenticated users only
CREATE POLICY "Users can view own balance"
ON public.user_balances
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all balances"
ON public.user_balances
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Explicitly deny anonymous access
CREATE POLICY "Deny anonymous access to balances"
ON public.user_balances
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- =============================================================================
-- USER_ROLES TABLE - High Risk: Exposes admin accounts
-- =============================================================================

-- Explicitly deny anonymous access
CREATE POLICY "Deny anonymous access to user roles"
ON public.user_roles
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- =============================================================================
-- VERIFICATION_REQUESTS TABLE - Critical: Contains identity documents
-- =============================================================================

-- Explicitly deny anonymous access
CREATE POLICY "Deny anonymous access to verification requests"
ON public.verification_requests
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- =============================================================================
-- DEPOSITS TABLE - Critical: Contains financial transactions
-- =============================================================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view their own deposits" ON public.deposits;
DROP POLICY IF EXISTS "Admins can view all deposits" ON public.deposits;

-- Recreate as PERMISSIVE for authenticated users
CREATE POLICY "Users can view own deposits"
ON public.deposits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all deposits"
ON public.deposits
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Explicitly deny anonymous access
CREATE POLICY "Deny anonymous access to deposits"
ON public.deposits
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- =============================================================================
-- WITHDRAWALS TABLE - Critical: Contains financial transactions
-- =============================================================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view their own withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Admins can view all withdrawals" ON public.withdrawals;

-- Recreate as PERMISSIVE for authenticated users
CREATE POLICY "Users can view own withdrawals"
ON public.withdrawals
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawals"
ON public.withdrawals
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Explicitly deny anonymous access
CREATE POLICY "Deny anonymous access to withdrawals"
ON public.withdrawals
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- =============================================================================
-- TRANSFERS TABLE - Critical: Contains financial transactions
-- =============================================================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own transfers" ON public.transfers;

-- Recreate as PERMISSIVE for authenticated users
CREATE POLICY "Users can view own transfers"
ON public.transfers
FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Explicitly deny anonymous access
CREATE POLICY "Deny anonymous access to transfers"
ON public.transfers
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- =============================================================================
-- GIFT_CARDS TABLE - Medium Risk: Contains redemption info
-- =============================================================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Admins can view all gift cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Users can view their redeemed gift cards" ON public.gift_cards;

-- Recreate as PERMISSIVE for authenticated users
CREATE POLICY "Users can view own redeemed cards"
ON public.gift_cards
FOR SELECT
TO authenticated
USING (auth.uid() = used_by AND is_used = true);

CREATE POLICY "Admins can view all gift cards"
ON public.gift_cards
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Explicitly deny anonymous access
CREATE POLICY "Deny anonymous access to gift cards"
ON public.gift_cards
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- =============================================================================
-- PLATFORM_LEDGER TABLE - Critical: Contains financial records
-- =============================================================================

-- Explicitly deny anonymous access
CREATE POLICY "Deny anonymous access to platform ledger"
ON public.platform_ledger
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- =============================================================================
-- PLATFORM_SETTINGS TABLE - Already has proper policies, just add anon block
-- =============================================================================

-- Explicitly deny anonymous access (except for payment_wallets which has its own policy)
CREATE POLICY "Deny anonymous access to platform settings"
ON public.platform_settings
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);