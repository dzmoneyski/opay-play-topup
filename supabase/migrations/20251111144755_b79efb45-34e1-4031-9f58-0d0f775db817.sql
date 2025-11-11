-- Fix the balance for user 19f8fa50-4c7a-427b-a5e0-2d7dd220d5e8
-- by manually recalculating
DO $$
BEGIN
  PERFORM public.recalculate_user_balance('19f8fa50-4c7a-427b-a5e0-2d7dd220d5e8');
END $$;