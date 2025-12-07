-- Fix: Restrict user_achievements to only allow users to view their own achievements
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view achievements for leaderboard" ON public.user_achievements;

-- Create a new policy that only allows users to view their own achievements
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all achievements for management
CREATE POLICY "Admins can view all achievements" 
ON public.user_achievements 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));