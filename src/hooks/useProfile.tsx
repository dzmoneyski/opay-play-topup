import React from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  national_id: string | null;
  is_phone_verified: boolean;
  is_identity_verified: boolean;
  is_account_activated: boolean;
  identity_verification_status: 'pending' | 'verified' | 'rejected';
}

interface VerificationRequest {
  id: string;
  status: string;
  rejection_reason: string | null;
  submitted_at: string;
}

export const useProfile = () => {
  const { user, session } = useAuth();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [verificationRequest, setVerificationRequest] = React.useState<VerificationRequest | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (user && session) {
      fetchProfile();
      fetchVerificationRequest();
    } else {
      setProfile(null);
      setVerificationRequest(null);
      setLoading(false);
    }
  }, [user, session]);

  const triedCreateRef = React.useRef(false);

  const fetchProfile = async () => {
    if (!user || !session) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
      }

      if (!data) {
        // جرّب إنشاء ملف شخصي تلقائياً للمستخدم الحالي إذا كان مفقوداً
        if (!triedCreateRef.current) {
          triedCreateRef.current = true;
          const derivedName = (user.user_metadata?.full_name as string | undefined)
            || user.email?.split('@')[0]
            || 'مستخدم';

          const { data: inserted, error: insertError } = await supabase
            .from('profiles')
            .insert({ user_id: user.id, full_name: derivedName })
            .select()
            .maybeSingle();

          if (insertError) {
            console.warn('Auto-create profile failed (will proceed without it):', insertError.message);
            setProfile(null);
          } else {
            setProfile(inserted as Profile);
          }
        } else {
          setProfile(null);
        }
      } else {
        setProfile(data as Profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerificationRequest = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('id, status, rejection_reason, submitted_at')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching verification request:', error);
      }

      setVerificationRequest(data);
    } catch (error) {
      console.error('Error fetching verification request:', error);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) return { error: 'No user or profile found' };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      setProfile(data as Profile);
      return { data, error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const submitPhoneVerification = async (phone: string) => {
    if (!user) return { error: 'No user found' };

    // Generate a random 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Expires in 10 minutes

    // Update phone in profile
    const { error: profileError } = await updateProfile({ phone });
    if (profileError) {
      return { error: profileError };
    }

    // Delete any existing verification code for this user
    await supabase
      .from('phone_verification_codes')
      .delete()
      .eq('user_id', user.id);

    // Insert new verification code in secure table
    const { error } = await supabase
      .from('phone_verification_codes')
      .insert({
        user_id: user.id,
        phone,
        code: verificationCode,
        expires_at: expiresAt.toISOString()
      });

    if (error) {
      return { error: error.message };
    }

    // In a real app, you would send the SMS here
    console.log('Verification code (for demo):', verificationCode);
    
    return { success: true, verificationCode }; // Remove this in production
  };

  const verifyPhoneCode = async (code: string) => {
    if (!user || !profile) return { error: 'No user or profile found' };

    // Fetch verification code from secure table
    const { data: verificationData, error: fetchError } = await supabase
      .from('phone_verification_codes')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      return { error: fetchError.message };
    }

    if (!verificationData) {
      return { error: 'لم يتم طلب رمز التفعيل' };
    }

    if (new Date() > new Date(verificationData.expires_at)) {
      return { error: 'انتهت صلاحية رمز التفعيل' };
    }

    if (verificationData.code !== code) {
      // Increment attempts
      await supabase
        .from('phone_verification_codes')
        .update({ attempts: verificationData.attempts + 1 })
        .eq('user_id', user.id);
      
      return { error: 'رمز التفعيل غير صحيح' };
    }

    // Code is correct - update profile
    const { error: updateError } = await updateProfile({
      is_phone_verified: true
    });

    if (updateError) {
      return { error: updateError };
    }

    // Delete verification code after successful verification
    await supabase
      .from('phone_verification_codes')
      .delete()
      .eq('user_id', user.id);

    return { success: true };
  };

  const submitIdentityVerification = async (
    nationalId: string, 
    frontImage?: File, 
    backImage?: File,
    additionalInfo?: {
      fullNameOnId: string;
      dateOfBirth: string;
      placeOfBirth: string;
      address: string;
    }
  ) => {
    if (!user) return { error: 'لم يتم تسجيل الدخول' };

    try {
      let frontImageUrl = null;
      let backImageUrl = null;

      // Upload front image if provided
      if (frontImage) {
        const frontFileName = `${user.id}/front_${Date.now()}.${frontImage.name.split('.').pop()}`;
        const { error: frontError } = await supabase.storage
          .from('identity-documents')
          .upload(frontFileName, frontImage);
        
        if (frontError) {
          return { error: `خطأ في رفع صورة الوجه الأمامي: ${frontError.message}` };
        }
        
        const { data: frontPublicUrl } = supabase.storage
          .from('identity-documents')
          .getPublicUrl(frontFileName);
        frontImageUrl = frontPublicUrl.publicUrl;
      }

      // Upload back image if provided
      if (backImage) {
        const backFileName = `${user.id}/back_${Date.now()}.${backImage.name.split('.').pop()}`;
        const { error: backError } = await supabase.storage
          .from('identity-documents')
          .upload(backFileName, backImage);
        
        if (backError) {
          return { error: `خطأ في رفع صورة الوجه الخلفي: ${backError.message}` };
        }
        
        const { data: backPublicUrl } = supabase.storage
          .from('identity-documents')
          .getPublicUrl(backFileName);
        backImageUrl = backPublicUrl.publicUrl;
      }

      const { data, error } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          national_id: nationalId,
          national_id_front_image: frontImageUrl,
          national_id_back_image: backImageUrl,
          full_name_on_id: additionalInfo?.fullNameOnId || null,
          date_of_birth: additionalInfo?.dateOfBirth || null,
          place_of_birth: additionalInfo?.placeOfBirth || null,
          address: additionalInfo?.address || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      // Update profile with national_id and status
      await updateProfile({
        national_id: nationalId,
        identity_verification_status: 'pending'
      });

      return { data, error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'خطأ غير معروف' };
    }
  };

  return {
    profile,
    verificationRequest,
    loading,
    updateProfile,
    submitPhoneVerification,
    verifyPhoneCode,
    submitIdentityVerification,
    refetch: fetchProfile
  };
};