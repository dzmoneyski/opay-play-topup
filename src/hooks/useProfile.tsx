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
  phone_verification_code: string | null;
  phone_verification_expires_at: string | null;
  identity_verification_status: 'pending' | 'verified' | 'rejected';
}

export const useProfile = () => {
  console.log("useProfile hook starting...");
  
  const { user } = useAuth();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);

  console.log("useProfile state:", { user: user?.id, profile: profile?.id, loading });

  React.useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data as Profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
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

    const { error } = await updateProfile({
      phone,
      phone_verification_code: verificationCode,
      phone_verification_expires_at: expiresAt.toISOString(),
    });

    if (error) {
      return { error };
    }

    // In a real app, you would send the SMS here
    console.log('Verification code (for demo):', verificationCode);
    
    return { success: true, verificationCode }; // Remove this in production
  };

  const verifyPhoneCode = async (code: string) => {
    if (!user || !profile) return { error: 'No user or profile found' };

    if (!profile.phone_verification_code) {
      return { error: 'لم يتم طلب رمز التفعيل' };
    }

    if (profile.phone_verification_expires_at && new Date() > new Date(profile.phone_verification_expires_at)) {
      return { error: 'انتهت صلاحية رمز التفعيل' };
    }

    if (profile.phone_verification_code !== code) {
      return { error: 'رمز التفعيل غير صحيح' };
    }

    const { error } = await updateProfile({
      is_phone_verified: true,
      phone_verification_code: null,
      phone_verification_expires_at: null,
    });

    if (error) {
      return { error };
    }

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
    loading,
    updateProfile,
    submitPhoneVerification,
    verifyPhoneCode,
    submitIdentityVerification,
    refetch: fetchProfile
  };
};