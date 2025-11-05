-- Create a function to sync existing users' emails from auth.users to profiles
CREATE OR REPLACE FUNCTION public.sync_existing_users_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_record RECORD;
  _updated_count INTEGER := 0;
BEGIN
  -- Loop through all auth users and update their profiles
  FOR _user_record IN 
    SELECT id, email, raw_user_meta_data
    FROM auth.users
  LOOP
    -- Update or insert profile with email and phone from auth
    INSERT INTO public.profiles (user_id, email, phone)
    VALUES (
      _user_record.id,
      _user_record.email,
      _user_record.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      updated_at = now();
    
    _updated_count := _updated_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'updated_count', _updated_count,
    'message', 'تم تحديث بيانات ' || _updated_count || ' مستخدم بنجاح'
  );
END;
$$;