-- =====================================================
-- 1. Create referral_codes table (كود الإحالة لكل مستخدم)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own referral code"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all referral codes"
  ON public.referral_codes FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 2. Create referrals table (سجل الإحالات)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled')),
  reward_amount NUMERIC(10,2) NOT NULL DEFAULT 100.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  UNIQUE(referred_user_id)
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update referrals"
  ON public.referrals FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Index for performance
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);

-- =====================================================
-- 3. Create referral_rewards table (رصيد المكافآت)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rewards_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_earned NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_withdrawn NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  active_referrals_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own rewards"
  ON public.referral_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all rewards"
  ON public.referral_rewards FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 4. Create user_achievements table (الأوسمة)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL CHECK (achievement_type IN (
    'bronze_medal', 'silver_medal', 'gold_medal', 'diamond_medal', 'legendary_medal',
    'speed_5_day', 'speed_10_week', 'speed_20_month',
    'top_1', 'top_2', 'top_3', 'top_10'
  )),
  achievement_name TEXT NOT NULL,
  reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_type)
);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view achievements for leaderboard"
  ON public.user_achievements FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage achievements"
  ON public.user_achievements FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Index for leaderboard queries
CREATE INDEX idx_achievements_user ON public.user_achievements(user_id);
CREATE INDEX idx_achievements_type ON public.user_achievements(achievement_type);

-- =====================================================
-- 5. Create referral_withdrawals table (سجل سحب المكافآت)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.referral_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  fee_percentage NUMERIC(5,2) NOT NULL,
  fee_amount NUMERIC(10,2) NOT NULL,
  net_amount NUMERIC(10,2) NOT NULL,
  active_referrals_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own withdrawals"
  ON public.referral_withdrawals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawals"
  ON public.referral_withdrawals FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function: Generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_unique_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code TEXT;
  _exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character code: REF + 5 random alphanumeric
    _code := 'REF' || UPPER(substring(md5(random()::text) from 1 for 5));
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE referral_code = _code) INTO _exists;
    
    EXIT WHEN NOT _exists;
  END LOOP;
  
  RETURN _code;
END;
$$;

-- Function: Create referral code for new user
CREATE OR REPLACE FUNCTION public.create_referral_code_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referral_code TEXT;
BEGIN
  -- Generate unique referral code
  _referral_code := public.generate_unique_referral_code();
  
  -- Insert referral code
  INSERT INTO public.referral_codes (user_id, referral_code)
  VALUES (NEW.user_id, _referral_code);
  
  -- Initialize rewards balance
  INSERT INTO public.referral_rewards (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger: Create referral code when profile is created
CREATE TRIGGER trigger_create_referral_code
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_referral_code_for_user();

-- Function: Process referral activation
CREATE OR REPLACE FUNCTION public.process_referral_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer_id UUID;
  _reward_amount NUMERIC := 100.00;
BEGIN
  -- Only process when account is activated
  IF NEW.is_account_activated = TRUE AND OLD.is_account_activated = FALSE THEN
    
    -- Check if this user was referred
    SELECT referrer_id INTO _referrer_id
    FROM public.referrals
    WHERE referred_user_id = NEW.user_id AND status = 'pending';
    
    IF _referrer_id IS NOT NULL THEN
      -- Update referral status
      UPDATE public.referrals
      SET status = 'active',
          activated_at = now()
      WHERE referred_user_id = NEW.user_id;
      
      -- Add reward to referrer
      UPDATE public.referral_rewards
      SET rewards_balance = rewards_balance + _reward_amount,
          total_earned = total_earned + _reward_amount,
          active_referrals_count = active_referrals_count + 1,
          updated_at = now()
      WHERE user_id = _referrer_id;
      
      -- Check and award achievements
      PERFORM public.check_and_award_achievements(_referrer_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger: Process referral when account is activated
CREATE TRIGGER trigger_process_referral_activation
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.is_account_activated IS DISTINCT FROM OLD.is_account_activated)
  EXECUTE FUNCTION public.process_referral_activation();

-- Function: Check and award achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _active_count INTEGER;
  _achievement_exists BOOLEAN;
BEGIN
  -- Get active referrals count
  SELECT active_referrals_count INTO _active_count
  FROM public.referral_rewards
  WHERE user_id = _user_id;
  
  -- Bronze Medal (10 referrals)
  IF _active_count >= 10 THEN
    SELECT EXISTS(SELECT 1 FROM public.user_achievements WHERE user_id = _user_id AND achievement_type = 'bronze_medal') INTO _achievement_exists;
    IF NOT _achievement_exists THEN
      INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, reward_amount)
      VALUES (_user_id, 'bronze_medal', 'وسام برونزي', 50.00);
      
      UPDATE public.referral_rewards
      SET rewards_balance = rewards_balance + 50.00,
          total_earned = total_earned + 50.00
      WHERE user_id = _user_id;
    END IF;
  END IF;
  
  -- Silver Medal (30 referrals)
  IF _active_count >= 30 THEN
    SELECT EXISTS(SELECT 1 FROM public.user_achievements WHERE user_id = _user_id AND achievement_type = 'silver_medal') INTO _achievement_exists;
    IF NOT _achievement_exists THEN
      INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, reward_amount)
      VALUES (_user_id, 'silver_medal', 'وسام فضي', 200.00);
      
      UPDATE public.referral_rewards
      SET rewards_balance = rewards_balance + 200.00,
          total_earned = total_earned + 200.00
      WHERE user_id = _user_id;
    END IF;
  END IF;
  
  -- Gold Medal (50 referrals)
  IF _active_count >= 50 THEN
    SELECT EXISTS(SELECT 1 FROM public.user_achievements WHERE user_id = _user_id AND achievement_type = 'gold_medal') INTO _achievement_exists;
    IF NOT _achievement_exists THEN
      INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, reward_amount)
      VALUES (_user_id, 'gold_medal', 'وسام ذهبي', 500.00);
      
      UPDATE public.referral_rewards
      SET rewards_balance = rewards_balance + 500.00,
          total_earned = total_earned + 500.00
      WHERE user_id = _user_id;
    END IF;
  END IF;
  
  -- Diamond Medal (100 referrals)
  IF _active_count >= 100 THEN
    SELECT EXISTS(SELECT 1 FROM public.user_achievements WHERE user_id = _user_id AND achievement_type = 'diamond_medal') INTO _achievement_exists;
    IF NOT _achievement_exists THEN
      INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, reward_amount)
      VALUES (_user_id, 'diamond_medal', 'وسام ألماسي', 1500.00);
      
      UPDATE public.referral_rewards
      SET rewards_balance = rewards_balance + 1500.00,
          total_earned = total_earned + 1500.00
      WHERE user_id = _user_id;
    END IF;
  END IF;
  
  -- Legendary Medal (500 referrals)
  IF _active_count >= 500 THEN
    SELECT EXISTS(SELECT 1 FROM public.user_achievements WHERE user_id = _user_id AND achievement_type = 'legendary_medal') INTO _achievement_exists;
    IF NOT _achievement_exists THEN
      INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, reward_amount)
      VALUES (_user_id, 'legendary_medal', 'وسام أسطوري', 10000.00);
      
      UPDATE public.referral_rewards
      SET rewards_balance = rewards_balance + 10000.00,
          total_earned = total_earned + 10000.00
      WHERE user_id = _user_id;
    END IF;
  END IF;
END;
$$;

-- Function: Calculate withdrawal fee based on referrals
CREATE OR REPLACE FUNCTION public.calculate_withdrawal_fee_percentage(_active_referrals INTEGER)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF _active_referrals >= 100 THEN
    RETURN 0; -- 100% withdrawal (no fee)
  ELSIF _active_referrals >= 50 THEN
    RETURN 50; -- 50% fee (can withdraw 50%)
  ELSIF _active_referrals >= 20 THEN
    RETURN 80; -- 80% fee (can withdraw 20%)
  ELSE
    RETURN 100; -- Cannot withdraw yet
  END IF;
END;
$$;

-- Function: Withdraw rewards to main balance
CREATE OR REPLACE FUNCTION public.withdraw_referral_rewards(_amount NUMERIC)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _rewards_balance NUMERIC;
  _active_referrals INTEGER;
  _fee_percentage NUMERIC;
  _fee_amount NUMERIC;
  _net_amount NUMERIC;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'المستخدم غير مسجل الدخول');
  END IF;
  
  -- Get rewards info
  SELECT rewards_balance, active_referrals_count 
  INTO _rewards_balance, _active_referrals
  FROM public.referral_rewards
  WHERE user_id = _user_id;
  
  -- Validate amount
  IF _amount <= 0 OR _amount > _rewards_balance THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ غير صحيح أو يتجاوز رصيد المكافآت');
  END IF;
  
  -- Check minimum referrals
  IF _active_referrals < 20 THEN
    RETURN json_build_object('success', false, 'error', 'تحتاج إلى 20 إحالة على الأقل للسحب');
  END IF;
  
  -- Calculate fee
  _fee_percentage := public.calculate_withdrawal_fee_percentage(_active_referrals);
  _fee_amount := _amount * _fee_percentage / 100;
  _net_amount := _amount - _fee_amount;
  
  -- Deduct from rewards balance
  UPDATE public.referral_rewards
  SET rewards_balance = rewards_balance - _amount,
      total_withdrawn = total_withdrawn + _amount,
      updated_at = now()
  WHERE user_id = _user_id;
  
  -- Add to main balance as approved deposit
  INSERT INTO public.deposits (user_id, amount, payment_method, status, admin_notes, processed_at)
  VALUES (_user_id, _net_amount, 'referral_reward', 'approved', 'سحب من رصيد المكافآت', now());
  
  -- Record withdrawal
  INSERT INTO public.referral_withdrawals (
    user_id, amount, fee_percentage, fee_amount, net_amount, active_referrals_count
  ) VALUES (
    _user_id, _amount, _fee_percentage, _fee_amount, _net_amount, _active_referrals
  );
  
  -- Recalculate main balance
  PERFORM public.recalculate_user_balance(_user_id);
  
  RETURN json_build_object(
    'success', true,
    'amount', _amount,
    'fee_percentage', _fee_percentage,
    'fee_amount', _fee_amount,
    'net_amount', _net_amount,
    'message', 'تم سحب المكافآت بنجاح'
  );
END;
$$;

-- =====================================================
-- Add referred_by column to profiles
-- =====================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by_code TEXT;