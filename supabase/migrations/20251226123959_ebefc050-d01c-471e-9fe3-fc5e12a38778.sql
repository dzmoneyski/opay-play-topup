
-- السماح للمستخدمين المسجلين بقراءة إعدادات الرسوم
CREATE POLICY "Authenticated can view fee settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (setting_key IN ('transfer_fees', 'deposit_fees', 'withdrawal_fees'));
