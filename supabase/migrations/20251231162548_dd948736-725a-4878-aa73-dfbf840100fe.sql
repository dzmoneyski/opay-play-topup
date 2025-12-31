
-- Allow admins to delete transfers
CREATE POLICY "Admins can delete transfers"
ON public.transfers
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
