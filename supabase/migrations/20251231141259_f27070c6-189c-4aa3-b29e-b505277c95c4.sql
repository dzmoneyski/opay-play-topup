
-- إضافة جهاز المستخدم المحظور Tahraoui ouail للحظر
INSERT INTO public.blocked_devices (device_fingerprint, user_agent, reason, blocked_user_id)
VALUES (
    'tahraoui_device_blocked',
    'blocked_user_agent_tahraoui',
    'احتيال مالي - متورط مع التاجر المحتال AKROUR ABDELLAH',
    '346db8b8-4724-464f-a1d1-3bcf287805d5'
);

-- تحديث سجل المستخدم المحظور بالبيانات
UPDATE public.blocked_users 
SET device_fingerprint = 'pending_capture',
    user_agent = 'pending_capture'
WHERE user_id = '18f35165-e269-4871-8cc7-8d650e898341';
