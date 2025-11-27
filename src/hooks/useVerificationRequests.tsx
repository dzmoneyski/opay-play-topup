import React from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface DuplicateInfo {
  type: 'national_id' | 'name' | 'front_image' | 'back_image';
  count: number;
  users: Array<{
    user_id: string;
    full_name: string | null;
    phone: string | null;
    submitted_at: string;
    status: string;
  }>;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  national_id: string;
  national_id_front_image: string | null;
  national_id_back_image: string | null;
  full_name_on_id: string | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  address: string | null;
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
  duplicates?: DuplicateInfo[];
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

      // Check for duplicates for each request
      const requestsWithProfilesAndDuplicates = await Promise.all(
        (requestsData || []).map(async (request) => {
          const profile = profilesData?.find(p => p.user_id === request.user_id) || null;
          const duplicates = await checkDuplicates(request, requestsData || []);
          
          return {
            ...request,
            profiles: profile,
            duplicates: duplicates.length > 0 ? duplicates : undefined
          };
        })
      );

      setRequests(requestsWithProfilesAndDuplicates as any);
    } catch (error) {
      console.error('Error fetching verification requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkDuplicates = async (
    currentRequest: any,
    allRequests: any[]
  ): Promise<DuplicateInfo[]> => {
    const duplicates: DuplicateInfo[] = [];

    // Check for duplicate national_id
    const nationalIdMatches = allRequests.filter(
      req => req.id !== currentRequest.id && 
             req.national_id === currentRequest.national_id
    );
    
    if (nationalIdMatches.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', nationalIdMatches.map(r => r.user_id));

      duplicates.push({
        type: 'national_id',
        count: nationalIdMatches.length,
        users: nationalIdMatches.map(req => {
          const profile = profiles?.find(p => p.user_id === req.user_id);
          return {
            user_id: req.user_id,
            full_name: profile?.full_name || null,
            phone: profile?.phone || null,
            submitted_at: req.submitted_at,
            status: req.status
          };
        })
      });
    }

    // Check for duplicate full_name_on_id
    if (currentRequest.full_name_on_id) {
      const nameMatches = allRequests.filter(
        req => req.id !== currentRequest.id && 
               req.full_name_on_id && 
               req.full_name_on_id.toLowerCase().trim() === currentRequest.full_name_on_id.toLowerCase().trim()
      );
      
      if (nameMatches.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', nameMatches.map(r => r.user_id));

        duplicates.push({
          type: 'name',
          count: nameMatches.length,
          users: nameMatches.map(req => {
            const profile = profiles?.find(p => p.user_id === req.user_id);
            return {
              user_id: req.user_id,
              full_name: profile?.full_name || null,
              phone: profile?.phone || null,
              submitted_at: req.submitted_at,
              status: req.status
            };
          })
        });
      }
    }

    // Check for duplicate front image
    if (currentRequest.national_id_front_image) {
      const frontImageMatches = allRequests.filter(
        req => req.id !== currentRequest.id && 
               req.national_id_front_image === currentRequest.national_id_front_image
      );
      
      if (frontImageMatches.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', frontImageMatches.map(r => r.user_id));

        duplicates.push({
          type: 'front_image',
          count: frontImageMatches.length,
          users: frontImageMatches.map(req => {
            const profile = profiles?.find(p => p.user_id === req.user_id);
            return {
              user_id: req.user_id,
              full_name: profile?.full_name || null,
              phone: profile?.phone || null,
              submitted_at: req.submitted_at,
              status: req.status
            };
          })
        });
      }
    }

    // Check for duplicate back image
    if (currentRequest.national_id_back_image) {
      const backImageMatches = allRequests.filter(
        req => req.id !== currentRequest.id && 
               req.national_id_back_image === currentRequest.national_id_back_image
      );
      
      if (backImageMatches.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', backImageMatches.map(r => r.user_id));

        duplicates.push({
          type: 'back_image',
          count: backImageMatches.length,
          users: backImageMatches.map(req => {
            const profile = profiles?.find(p => p.user_id === req.user_id);
            return {
              user_id: req.user_id,
              full_name: profile?.full_name || null,
              phone: profile?.phone || null,
              submitted_at: req.submitted_at,
              status: req.status
            };
          })
        });
      }
    }

    return duplicates;
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