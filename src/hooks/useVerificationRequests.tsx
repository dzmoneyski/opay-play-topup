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
  id_front_image: string | null;
  id_back_image: string | null;
  full_name: string | null;
  date_of_birth: string | null;
  place_of_birth?: string | null;
  address?: string | null;
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
  const [page, setPage] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const pageSize = 20;

  React.useEffect(() => {
    if (user) {
      fetchVerificationRequests();
    } else {
      setRequests([]);
      setLoading(false);
    }
  }, [user, page]);

  const fetchVerificationRequests = async () => {
    if (!user) return;

    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Get verification requests with count
      const { data: requestsData, error: requestsError, count } = await supabase
        .from('verification_requests')
        .select('*', { count: 'exact' })
        .order('submitted_at', { ascending: false })
        .range(from, to);

      if (requestsError) {
        console.error('Error fetching verification requests:', requestsError);
        return;
      }

      setTotalCount(count || 0);

      // Get profiles for the current page
      const userIds = [...new Set(requestsData?.map(req => req.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', userIds);

      // Only check duplicates for pending requests to reduce load
      const requestsWithData = await Promise.all(
        (requestsData || []).map(async (request) => {
          const profile = profilesData?.find(p => p.user_id === request.user_id) || null;
          let duplicates = undefined;
          
          // Only check duplicates for pending requests
          if (request.status === 'pending') {
            const dups = await checkDuplicatesOptimized(request);
            duplicates = dups.length > 0 ? dups : undefined;
          }
          
          return {
            ...request,
            profiles: profile,
            duplicates
          };
        })
      );

      setRequests(requestsWithData as any);
    } catch (error) {
      console.error('Error fetching verification requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkDuplicatesOptimized = async (
    currentRequest: any
  ): Promise<DuplicateInfo[]> => {
    const duplicates: DuplicateInfo[] = [];

    try {
      // Build OR conditions dynamically
      const conditions: string[] = [];
      if (currentRequest.national_id) {
        conditions.push(`national_id.eq.${currentRequest.national_id}`);
      }
      if (currentRequest.full_name) {
        conditions.push(`full_name.ilike.${currentRequest.full_name.trim()}`);
      }
      if (currentRequest.id_front_image) {
        conditions.push(`id_front_image.eq.${currentRequest.id_front_image}`);
      }
      if (currentRequest.id_back_image) {
        conditions.push(`id_back_image.eq.${currentRequest.id_back_image}`);
      }

      if (conditions.length === 0) return duplicates;

      // Check all duplicates in a single query
      const { data: matches, error } = await supabase
        .from('verification_requests')
        .select('id, user_id, national_id, full_name, id_front_image, id_back_image, submitted_at, status')
        .neq('id', currentRequest.id)
        .or(conditions.join(','));

      if (error) {
        console.error('Error checking duplicates:', error);
        return duplicates;
      }

      if (!matches || matches.length === 0) return duplicates;

      // Get profiles for duplicates
      const userIds = [...new Set(matches.map(m => m.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', userIds);

      // Group duplicates by type
      const nationalIdMatches = matches.filter(m => m.national_id === currentRequest.national_id);
      const nameMatches = matches.filter(m => 
        m.full_name && currentRequest.full_name &&
        m.full_name.toLowerCase().trim() === currentRequest.full_name.toLowerCase().trim()
      );
      const frontImageMatches = matches.filter(m => 
        m.id_front_image && m.id_front_image === currentRequest.id_front_image
      );
      const backImageMatches = matches.filter(m => 
        m.id_back_image && m.id_back_image === currentRequest.id_back_image
      );

      if (nationalIdMatches.length > 0) {
        duplicates.push({
          type: 'national_id',
          count: nationalIdMatches.length,
          users: nationalIdMatches.map(req => {
            const profile = profilesData?.find(p => p.user_id === req.user_id);
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

      if (nameMatches.length > 0) {
        duplicates.push({
          type: 'name',
          count: nameMatches.length,
          users: nameMatches.map(req => {
            const profile = profilesData?.find(p => p.user_id === req.user_id);
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

      if (frontImageMatches.length > 0) {
        duplicates.push({
          type: 'front_image',
          count: frontImageMatches.length,
          users: frontImageMatches.map(req => {
            const profile = profilesData?.find(p => p.user_id === req.user_id);
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

      if (backImageMatches.length > 0) {
        duplicates.push({
          type: 'back_image',
          count: backImageMatches.length,
          users: backImageMatches.map(req => {
            const profile = profilesData?.find(p => p.user_id === req.user_id);
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
    } catch (error) {
      console.error('Error in checkDuplicatesOptimized:', error);
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
    refetch: fetchVerificationRequests,
    page,
    setPage,
    totalCount,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize)
  };
};