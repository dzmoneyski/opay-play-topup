
-- ==========================================
-- P2P Trading System - Complete Schema
-- ==========================================

-- 1. P2P Advertisements (Buy/Sell offers)
CREATE TABLE public.p2p_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('buy', 'sell')),
  -- buy = user wants to buy platform balance (pays real money)
  -- sell = user wants to sell platform balance (receives real money)
  amount NUMERIC NOT NULL CHECK (amount > 0),
  min_amount NUMERIC NOT NULL DEFAULT 500 CHECK (min_amount > 0),
  max_amount NUMERIC NOT NULL CHECK (max_amount > 0),
  price_per_unit NUMERIC NOT NULL DEFAULT 1 CHECK (price_per_unit > 0),
  -- price ratio e.g. 1.02 means 2% markup
  payment_methods TEXT[] NOT NULL DEFAULT '{}',
  -- e.g. {'baridimob', 'ccp', 'payeer'}
  terms TEXT, -- seller/buyer terms
  is_active BOOLEAN NOT NULL DEFAULT true,
  completed_trades INTEGER NOT NULL DEFAULT 0,
  total_volume NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT min_less_than_max CHECK (min_amount <= max_amount),
  CONSTRAINT max_less_than_amount CHECK (max_amount <= amount)
);

ALTER TABLE public.p2p_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active ads" ON public.p2p_ads
  FOR SELECT USING (is_active = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own ads" ON public.p2p_ads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ads" ON public.p2p_ads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ads" ON public.p2p_ads
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all ads" ON public.p2p_ads
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. P2P Orders (when someone takes an ad)
CREATE TABLE public.p2p_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.p2p_ads(id),
  buyer_id UUID NOT NULL, -- the one paying real money
  seller_id UUID NOT NULL, -- the one sending platform balance
  amount NUMERIC NOT NULL CHECK (amount > 0),
  total_price NUMERIC NOT NULL CHECK (total_price > 0),
  payment_method TEXT NOT NULL,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  fee_percentage NUMERIC NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',        -- order created, waiting seller to lock funds
    'escrow_locked',  -- seller's balance locked in escrow
    'payment_sent',   -- buyer says they sent payment
    'payment_confirmed', -- seller confirms receiving payment
    'completed',      -- trade completed, balance released
    'cancelled',      -- cancelled by either party
    'disputed',       -- dispute opened
    'dispute_resolved' -- admin resolved the dispute
  )),
  escrow_locked_at TIMESTAMPTZ,
  payment_sent_at TIMESTAMPTZ,
  payment_confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  payment_deadline TIMESTAMPTZ, -- 30 min from escrow lock
  buyer_rating INTEGER CHECK (buyer_rating >= 1 AND buyer_rating <= 5),
  seller_rating INTEGER CHECK (seller_rating >= 1 AND seller_rating <= 5),
  buyer_review TEXT,
  seller_review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.p2p_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders" ON public.p2p_orders
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create orders" ON public.p2p_orders
  FOR INSERT WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Participants can update orders" ON public.p2p_orders
  FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Admins can manage all orders" ON public.p2p_orders
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. P2P Chat Messages
CREATE TABLE public.p2p_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.p2p_orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT,
  image_url TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.p2p_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order participants can view messages" ON public.p2p_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.p2p_orders
      WHERE id = p2p_messages.order_id
        AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

CREATE POLICY "Order participants can send messages" ON public.p2p_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.p2p_orders
      WHERE id = p2p_messages.order_id
        AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage all messages" ON public.p2p_messages
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. P2P Disputes
CREATE TABLE public.p2p_disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.p2p_orders(id) UNIQUE,
  opened_by UUID NOT NULL,
  reason TEXT NOT NULL,
  evidence_images TEXT[] DEFAULT '{}',
  admin_notes TEXT,
  resolution TEXT, -- 'release_to_buyer', 'return_to_seller', 'split'
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.p2p_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order participants can view disputes" ON public.p2p_disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.p2p_orders
      WHERE id = p2p_disputes.order_id
        AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

CREATE POLICY "Order participants can create disputes" ON public.p2p_disputes
  FOR INSERT WITH CHECK (
    auth.uid() = opened_by AND
    EXISTS (
      SELECT 1 FROM public.p2p_orders
      WHERE id = p2p_disputes.order_id
        AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage all disputes" ON public.p2p_disputes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. P2P Trader Profiles (reputation)
CREATE TABLE public.p2p_trader_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_trades INTEGER NOT NULL DEFAULT 0,
  successful_trades INTEGER NOT NULL DEFAULT 0,
  avg_rating NUMERIC NOT NULL DEFAULT 0,
  total_volume NUMERIC NOT NULL DEFAULT 0,
  avg_release_time INTEGER NOT NULL DEFAULT 0, -- in seconds
  is_verified_trader BOOLEAN NOT NULL DEFAULT false,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.p2p_trader_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trader profiles" ON public.p2p_trader_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can create own trader profile" ON public.p2p_trader_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System updates trader profiles" ON public.p2p_trader_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage trader profiles" ON public.p2p_trader_profiles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. Indexes for performance
CREATE INDEX idx_p2p_ads_active ON public.p2p_ads(is_active, ad_type) WHERE is_active = true;
CREATE INDEX idx_p2p_ads_user ON public.p2p_ads(user_id);
CREATE INDEX idx_p2p_orders_buyer ON public.p2p_orders(buyer_id);
CREATE INDEX idx_p2p_orders_seller ON public.p2p_orders(seller_id);
CREATE INDEX idx_p2p_orders_status ON public.p2p_orders(status);
CREATE INDEX idx_p2p_orders_ad ON public.p2p_orders(ad_id);
CREATE INDEX idx_p2p_messages_order ON public.p2p_messages(order_id, created_at);
CREATE INDEX idx_p2p_disputes_order ON public.p2p_disputes(order_id);
CREATE INDEX idx_p2p_trader_user ON public.p2p_trader_profiles(user_id);

-- 7. Auto-update timestamps trigger
CREATE TRIGGER update_p2p_ads_updated_at
  BEFORE UPDATE ON public.p2p_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_p2p_orders_updated_at
  BEFORE UPDATE ON public.p2p_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_p2p_disputes_updated_at
  BEFORE UPDATE ON public.p2p_disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_p2p_trader_profiles_updated_at
  BEFORE UPDATE ON public.p2p_trader_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
