-- Enable RLS on digital_card_types table (if not already enabled)
ALTER TABLE public.digital_card_types ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view digital card types" ON public.digital_card_types;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.digital_card_types;

-- Create a policy that allows all authenticated users to view all digital card types
CREATE POLICY "All authenticated users can view digital card types"
ON public.digital_card_types
FOR SELECT
TO authenticated
USING (true);

-- Also allow anonymous users to view card types (for browsing before login)
CREATE POLICY "Anonymous users can view digital card types"
ON public.digital_card_types
FOR SELECT
TO anon
USING (true);