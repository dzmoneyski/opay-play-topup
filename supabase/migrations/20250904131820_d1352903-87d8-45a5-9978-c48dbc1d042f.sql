-- Create RLS policies for identity documents bucket
CREATE POLICY "Users can upload their own identity documents" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'identity-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own identity documents" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'identity-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all identity documents" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'identity-documents' 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can update their own identity documents" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'identity-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own identity documents" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'identity-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);