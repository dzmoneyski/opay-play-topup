-- Insert new game platforms
INSERT INTO public.game_platforms (name, name_ar, slug, category, display_order, is_active) VALUES
-- Games from images
('Valorant', 'فالورانت', 'valorant', 'game', 10, true),
('Apex Legends', 'ابيكس ليجندز', 'apex', 'game', 11, true),
('Minecraft', 'ماين كرافت', 'minecraft', 'game', 12, true),
('Final Fantasy XIV', 'فاينل فانتسي', 'finalfantasy', 'game', 13, true),
('Fortnite PC', 'فورت نايت', 'fortnite', 'game', 14, true),
('PUBG New State', 'ببجي نيو ستيت', 'pubgnewstate', 'game', 15, true),
('Nintendo Switch US', 'نينتندو سويتش أمريكا', 'nintendo-us', 'game', 16, true),
('Nintendo Switch EU', 'نينتندو سويتش أوروبا', 'nintendo-eu', 'game', 17, true),
('Roblox EU', 'روبلوكس أوروبا', 'roblox-eu', 'game', 18, true),
('Roblox US', 'روبلوكس أمريكا', 'roblox-us', 'game', 19, true),
('League of Legends', 'ليج أوف ليجندز', 'lol', 'game', 20, true),
('Xbox Live EUR', 'اكس بوكس لايف أوروبا', 'xbox-eur', 'game', 21, true),
('Xbox Live USD', 'اكس بوكس لايف أمريكا', 'xbox-usd', 'game', 22, true),
('Steam USD', 'ستيم أمريكا', 'steam-usd', 'game', 23, true),
('Steam EUR', 'ستيم أوروبا', 'steam-eur', 'game', 24, true),
('Origin', 'اوريجن', 'origin', 'game', 25, true),
('Runescape', 'رن سكيب', 'runescape', 'game', 26, true),
('Blizzard', 'بليزارد', 'blizzard', 'game', 27, true)
ON CONFLICT (slug) DO NOTHING;