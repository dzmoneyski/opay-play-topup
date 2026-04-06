
CREATE TABLE public.announcement_acknowledgments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  announcement_key TEXT NOT NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, announcement_key)
);

ALTER TABLE public.announcement_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own acknowledgment"
ON public.announcement_acknowledgments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own acknowledgments"
ON public.announcement_acknowledgments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all acknowledgments"
ON public.announcement_acknowledgments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
