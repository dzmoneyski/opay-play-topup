import React from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface VerificationRequest {
  id: string;
  user_id: string;
  national_id: string;
  national_id_front_image: string | null;
  national_id_back_image: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    phone: string | null;
  };
}

export const useVerificationRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = React.useState<VerificationRequest[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      fetchVerificationRequests();
    } else {
      setRequests([]);
      setLoading(false);
    }
  }, [user]);

  const fetchVerificationRequests = async () => {
    if (!user) return;

    try {
      // First get all verification requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('verification_requests')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (requestsError) {
        console.error('Error fetching verification requests:', requestsError);
        return;
      }

      // Then get profiles for each user_id
      const userIds = [...new Set(requestsData?.map(req => req.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Merge the data
      const requestsWithProfiles = requestsData?.map(request => ({
        ...request,
        profiles: profilesData?.find(profile => profile.user_id === request.user_id) || null
      })) || [];

      setRequests(requestsWithProfiles as any);
    } catch (error) {
      console.error('Error fetching verification requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (requestId: string) => {
    if (!user) return { error: 'لم يتم تسجيل الدخول' };

    try {
      const { error } = await supabase.rpc('approve_verification_request', {
        _request_id: requestId,
        _admin_id: user.id
      });

      if (error) {
        return { error: error.message };
      }

      await fetchVerificationRequests();
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'خطأ غير معروف' };
    }
  };

  const rejectRequest = async (requestId: string, reason: string) => {
    if (!user) return { error: 'لم يتم تسجيل الدخول' };

    try {
      const { error } = await supabase.rpc('reject_verification_request', {
        _request_id: requestId,
        _admin_id: user.id,
        _reason: reason
      });

      if (error) {
        return { error: error.message };
      }

      await fetchVerificationRequests();
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'خطأ غير معروف' };
    }
  };

  return {
    requests,
    loading,
    approveRequest,
    rejectRequest,
    refetch: fetchVerificationRequests
  };
};