-- Create game platforms table for managing available games/platforms
CREATE TABLE public.game_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  category TEXT NOT NULL DEFAULT 'game', -- 'game' or 'betting'
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create game packages table for each platform
CREATE TABLE public.game_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID NOT NULL REFERENCES public.game_platforms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create game topup orders table
CREATE TABLE public.game_topup_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform_id UUID NOT NULL REFERENCES public.game_platforms(id),
  package_id UUID NOT NULL REFERENCES public.game_packages(id),
  player_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, rejected
  notes TEXT,
  admin_notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_topup_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_platforms
CREATE POLICY "Anyone can view active game platforms"
ON public.game_platforms FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage game platforms"
ON public.game_platforms FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for game_packages
CREATE POLICY "Anyone can view active packages"
ON public.game_packages FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage game packages"
ON public.game_packages FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for game_topup_orders
CREATE POLICY "Users can view their own orders"
ON public.game_topup_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
ON public.game_topup_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
ON public.game_topup_orders FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orders"
ON public.game_topup_orders FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Add indexes for better performance
CREATE INDEX idx_game_platforms_active ON public.game_platforms(is_active, display_order);
CREATE INDEX idx_game_packages_platform ON public.game_packages(platform_id, is_active);
CREATE INDEX idx_game_topup_orders_user ON public.game_topup_orders(user_id, created_at DESC);
CREATE INDEX idx_game_topup_orders_status ON public.game_topup_orders(status, created_at DESC);

-- Add triggers for updated_at
CREATE TRIGGER update_game_platforms_updated_at
BEFORE UPDATE ON public.game_platforms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_game_packages_updated_at
BEFORE UPDATE ON public.game_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_game_topup_orders_updated_at
BEFORE UPDATE ON public.game_topup_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial game platforms
INSERT INTO public.game_platforms (name, name_ar, slug, category, display_order) VALUES
('1xBet', '1xBet', '1xbet', 'betting', 1),
('LinBet', 'LinBet', 'linbet', 'betting', 2),
('MelBet', 'MelBet', 'melbet', 'betting', 3),
('GooBet', 'GooBet', 'gooobet', 'betting', 4),
('XpariBet', 'XpariBet', 'xparibet', 'betting', 5),
('PUBG Mobile', 'ببجي موبايل', 'pubg', 'game', 6),
('Free Fire', 'فري فاير', 'freefire', 'game', 7),
('Call of Duty Mobile', 'كول أوف ديوتي موبايل', 'codm', 'game', 8),
('Mobile Legends', 'موبايل ليجندز', 'mobilelegends', 'game', 9);

-- Insert sample packages for PUBG
INSERT INTO public.game_packages (platform_id, name, name_ar, price, display_order)
SELECT id, '60 UC', '60 UC', 150, 1 FROM public.game_platforms WHERE slug = 'pubg'
UNION ALL
SELECT id, '325 UC', '325 UC', 750, 2 FROM public.game_platforms WHERE slug = 'pubg'
UNION ALL
SELECT id, '660 UC', '660 UC', 1500, 3 FROM public.game_platforms WHERE slug = 'pubg'
UNION ALL
SELECT id, '1800 UC', '1800 UC', 3750, 4 FROM public.game_platforms WHERE slug = 'pubg';

-- Insert sample packages for Free Fire
INSERT INTO public.game_packages (platform_id, name, name_ar, price, display_order)
SELECT id, '100 Diamonds', '100 ماسة', 200, 1 FROM public.game_platforms WHERE slug = 'freefire'
UNION ALL
SELECT id, '310 Diamonds', '310 ماسة', 600, 2 FROM public.game_platforms WHERE slug = 'freefire'
UNION ALL
SELECT id, '520 Diamonds', '520 ماسة', 1000, 3 FROM public.game_platforms WHERE slug = 'freefire'
UNION ALL
SELECT id, '1060 Diamonds', '1060 ماسة', 2000, 4 FROM public.game_platforms WHERE slug = 'freefire';