import { useState, useEffect } from 'react';
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
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      const { data, error } = await supabase
        .from('verification_requests')
        .select(`
          *,
          profiles!verification_requests_user_id_fkey (
            full_name,
            phone
          )
        `)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching verification requests:', error);
        return;
      }

      setRequests(data as any);
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