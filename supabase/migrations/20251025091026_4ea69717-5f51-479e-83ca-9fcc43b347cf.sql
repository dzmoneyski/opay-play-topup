-- Add foreign key relationships between betting tables and profiles

-- Add foreign key for betting_accounts -> profiles
ALTER TABLE public.betting_accounts
DROP CONSTRAINT IF EXISTS betting_accounts_user_id_fkey;

ALTER TABLE public.betting_accounts
ADD CONSTRAINT betting_accounts_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(user_id)
ON DELETE CASCADE;

-- Add foreign key for betting_transactions -> profiles  
ALTER TABLE public.betting_transactions
DROP CONSTRAINT IF EXISTS betting_transactions_user_id_fkey;

ALTER TABLE public.betting_transactions
ADD CONSTRAINT betting_transactions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(user_id)
ON DELETE CASCADE;

-- Add foreign key for betting_accounts -> game_platforms
ALTER TABLE public.betting_accounts
DROP CONSTRAINT IF EXISTS betting_accounts_platform_id_fkey;

ALTER TABLE public.betting_accounts
ADD CONSTRAINT betting_accounts_platform_id_fkey
FOREIGN KEY (platform_id)
REFERENCES public.game_platforms(id)
ON DELETE CASCADE;

-- Add foreign key for betting_transactions -> game_platforms
ALTER TABLE public.betting_transactions
DROP CONSTRAINT IF EXISTS betting_transactions_platform_id_fkey;

ALTER TABLE public.betting_transactions
ADD CONSTRAINT betting_transactions_platform_id_fkey
FOREIGN KEY (platform_id)
REFERENCES public.game_platforms(id)
ON DELETE CASCADE;