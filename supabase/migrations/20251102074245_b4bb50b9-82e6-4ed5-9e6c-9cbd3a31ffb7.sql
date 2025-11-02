-- Fix function search path for generate_merchant_code
-- This addresses the Supabase linter warning about mutable search_path

CREATE OR REPLACE FUNCTION public.generate_merchant_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code TEXT;
  _exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character code: M + 7 random digits
    _code := 'M' || LPAD(FLOOR(RANDOM() * 10000000)::TEXT, 7, '0');
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM public.merchants WHERE merchant_code = _code) INTO _exists;
    
    EXIT WHEN NOT _exists;
  END LOOP;
  
  RETURN _code;
END;
$$;