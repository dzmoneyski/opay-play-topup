-- إضافة foreign key لربط digital_card_orders مع profiles
ALTER TABLE public.digital_card_orders
ADD CONSTRAINT digital_card_orders_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
ON DELETE CASCADE;