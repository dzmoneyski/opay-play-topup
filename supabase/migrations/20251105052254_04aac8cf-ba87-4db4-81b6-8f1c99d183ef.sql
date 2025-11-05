-- Update sync function to only UPDATE existing profiles, not create new ones
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
  -- Loop through existing profiles only (don't create new ones)
  FOR _user_record IN 
    SELECT p.user_id, u.email, u.raw_user_meta_data
    FROM public.profiles p
    INNER JOIN auth.users u ON p.user_id = u.id
  LOOP
    -- Update existing profile with email and phone from auth
    UPDATE public.profiles
    SET 
      email = _user_record.email,
      phone = COALESCE(_user_record.raw_user_meta_data->>'phone', phone),
      updated_at = now()
    WHERE user_id = _user_record.user_id;
    
    _updated_count := _updated_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'updated_count', _updated_count,
    'message', 'تم تحديث بيانات ' || _updated_count || ' مستخدم بنجاح'
  );
END;
$$;

-- Create function to permanently delete a user (from auth.users and all related data)
CREATE OR REPLACE FUNCTION public.admin_delete_user(_target_user_id uuid, _admin_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can delete users';
  END IF;

  -- Delete from auth.users (this will cascade delete from profiles and all related tables)
  DELETE FROM auth.users WHERE id = _target_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تم حذف المستخدم نهائياً من النظام'
  );
END;
$$;