import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface VerificationRequest {
  id: string;
  user_id: string;
  national_id: string;
  full_name: string;
  date_of_birth: string | null;
  id_front_image: string;
  id_back_image: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  user?: {
    full_name: string | null;
    phone: string | null;
    email: string | null;
  };
}

/**
 * Hook للتعامل مع طلبات التحقق من الهوية
 */
export const useVerification = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // جلب الطلبات
  const fetchRequests = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 جاري جلب طلبات التحقق...');
      
      // جلب جميع الطلبات
      const { data: requestsData, error } = await supabase
        .from('verification_requests')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('❌ خطأ في جلب الطلبات:', error);
        throw error;
      }

      console.log(`✅ تم جلب ${requestsData?.length || 0} طلب`);

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // جلب بيانات المستخدمين
      const userIds = requestsData.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, email')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('⚠️ خطأ في جلب بيانات المستخدمين:', profilesError);
      }

      console.log(`👥 تم جلب بيانات ${profiles?.length || 0} مستخدم`);

      // دمج البيانات
      const requestsWithProfiles = requestsData.map(req => {
        const profile = profiles?.find(p => p.user_id === req.user_id);
        return {
          ...req,
          user: profile ? {
            full_name: profile.full_name,
            phone: profile.phone,
            email: profile.email
          } : null
        };
      });

      setRequests(requestsWithProfiles as VerificationRequest[]);
      console.log('✅ تم دمج البيانات بنجاح');
    } catch (error: any) {
      console.error('❌ خطأ في جلب الطلبات:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  // الموافقة على الطلب
  const approveRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.rpc('approve_verification', {
        request_id: requestId
      });

      if (error) throw error;

      await fetchRequests();
      return { success: true };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  // رفض الطلب
  const rejectRequest = async (requestId: string, reason: string) => {
    try {
      const { error } = await supabase.rpc('reject_verification', {
        request_id: requestId,
        reason: reason
      });

      if (error) throw error;

      await fetchRequests();
      return { success: true };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  return {
    requests,
    loading,
    approveRequest,
    rejectRequest,
    refetch: fetchRequests
  };
};
