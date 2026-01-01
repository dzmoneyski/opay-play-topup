-- إضافة عمود لتتبع آخر تغيير للبريد الإلكتروني
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_email_change_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;