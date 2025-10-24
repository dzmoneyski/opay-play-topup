-- Create storage bucket for game platform logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-logos', 'game-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for game-logos bucket
CREATE POLICY "Anyone can view game logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'game-logos');

CREATE POLICY "Admins can upload game logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'game-logos' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update game logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'game-logos' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete game logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'game-logos' 
  AND public.has_role(auth.uid(), 'admin')
);