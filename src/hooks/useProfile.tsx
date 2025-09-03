import { useState, useEffect } from 'react';
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
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const submitIdentityVerification = async (nationalId: string) => {
    if (!user) return { error: 'No user found' };

    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          national_id: nationalId,
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
      return { error: error instanceof Error ? error.message : 'Unknown error' };
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