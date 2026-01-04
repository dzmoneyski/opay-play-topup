
-- إصلاح سياسة القراءة لتشمل الرموز المنتهية (للتحقق من المحاولات)
DROP POLICY IF EXISTS "Users can view their own active codes" ON phone_verification_codes;

CREATE POLICY "Users can view their own codes" 
ON phone_verification_codes 
FOR SELECT 
USING (auth.uid() = user_id);

-- إضافة سياسة للسماح بتحديث الرموز (لزيادة عدد المحاولات)
DROP POLICY IF EXISTS "Users can update their own codes" ON phone_verification_codes;

CREATE POLICY "Users can update their own codes" 
ON phone_verification_codes 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
