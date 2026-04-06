import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface AdminDeposit {
  id: string;
  user_id: string;
  payment_method: string;
  amount: number;
  transaction_id: string | null;
  receipt_image: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    phone: string | null;
  };
}

export const useAdminDeposits = () => {
  const [deposits, setDeposits] = React.useState<AdminDeposit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const pageSize = 20;
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchDeposits = React.useCallback(async (fetchAll: boolean = false) => {
    if (!user) return;
    
    setLoading(true);
    try {
      if (fetchAll) {
        const { data: depositsData, error: depositsError, count } = await supabase
          .from('deposits')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (depositsError) throw depositsError;
        setTotalCount(count || 0);

        if (!depositsData || depositsData.length === 0) {
          setDeposits([]);
          return;
        }

        const userIds = [...new Set(depositsData.map(d => d.user_id))];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        const depositsWithProfiles = depositsData.map(deposit => ({
          ...deposit,
          profiles: profilesData?.find(profile => profile.user_id === deposit.user_id) || null
        }));

        setDeposits(depositsWithProfiles as any[]);
        return;
      }

      // Pending-first pagination
      const { count: totalCountResult } = await supabase
        .from('deposits')
        .select('*', { count: 'exact', head: true });

      setTotalCount(totalCountResult || 0);

      let depositsData: any[] = [];

      if (page === 1) {
        // Page 1: pending first, then fill with others
        const { data: pendingData } = await supabase
          .from('deposits')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        depositsData = pendingData || [];

        const remaining = pageSize - depositsData.length;
        if (remaining > 0) {
          const { data: otherData } = await supabase
            .from('deposits')
            .select('*')
            .neq('status', 'pending')
            .order('created_at', { ascending: false })
            .range(0, remaining - 1);

          depositsData = [...depositsData, ...(otherData || [])];
        }
      } else {
        const { count: pendingCount } = await supabase
          .from('deposits')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        const adjustedFrom = (page - 1) * pageSize - (pendingCount || 0);
        const adjustedTo = adjustedFrom + pageSize - 1;

        const { data: otherData } = await supabase
          .from('deposits')
          .select('*')
          .neq('status', 'pending')
          .order('created_at', { ascending: false })
          .range(Math.max(0, adjustedFrom), Math.max(0, adjustedTo));

        depositsData = otherData || [];
      }

      if (!depositsData || depositsData.length === 0) {
        setDeposits([]);
        return;
      }

      // Get profile data for unique user_ids
      const userIds = [...new Set(depositsData.map(d => d.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine deposits with profile data
      const depositsWithProfiles = depositsData.map(deposit => ({
        ...deposit,
        profiles: profilesData?.find(profile => profile.user_id === deposit.user_id) || null
      }));

      setDeposits(depositsWithProfiles as any[]);
    } catch (error) {
      console.error('Error fetching deposits:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل طلبات الإيداع",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast, page]);

  React.useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  // Realtime subscription - only refetch on changes
  React.useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('admin-deposits-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deposits' },
        () => fetchDeposits()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchDeposits]);

  const approveDeposit = async (depositId: string, notes?: string, adjustedAmount?: number) => {
    if (!user) return { success: false, error: "غير مصرح" };

    try {
      const { error } = await supabase.rpc('approve_deposit', {
        _deposit_id: depositId,
        _admin_id: user.id,
        _notes: notes || null,
        _adjusted_amount: adjustedAmount ?? null
      });

      if (error) throw error;

      // Update local state
      setDeposits(prev => prev.map(deposit => 
        deposit.id === depositId 
          ? { 
              ...deposit, 
              status: 'approved', 
              processed_by: user.id,
              processed_at: new Date().toISOString(),
              admin_notes: notes || null,
              amount: adjustedAmount ?? deposit.amount
            }
          : deposit
      ));

      toast({
        title: "تم بنجاح",
        description: "تم قبول طلب الإيداع بنجاح",
      });

      return { success: true };
    } catch (error) {
      console.error('Error approving deposit:', error);
      const errorMessage = error instanceof Error ? error.message : "فشل في قبول الطلب";
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive"
      });
      return { success: false, error: errorMessage };
    }
  };

  const rejectDeposit = async (depositId: string, reason: string) => {
    if (!user) return { success: false, error: "غير مصرح" };

    if (!reason.trim()) {
      toast({
        title: "خطأ",
        description: "يجب إدخال سبب الرفض",
        variant: "destructive"
      });
      return { success: false, error: "سبب الرفض مطلوب" };
    }

    try {
      const { error } = await supabase
        .from('deposits')
        .update({
          status: 'rejected',
          admin_notes: reason,
          processed_by: user.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', depositId);

      if (error) throw error;

      // Update local state
      setDeposits(prev => prev.map(deposit => 
        deposit.id === depositId 
          ? { 
              ...deposit, 
              status: 'rejected', 
              processed_by: user.id,
              processed_at: new Date().toISOString(),
              admin_notes: reason
            }
          : deposit
      ));

      toast({
        title: "تم بنجاح",
        description: "تم رفض طلب الإيداع",
      });

      return { success: true };
    } catch (error) {
      console.error('Error rejecting deposit:', error);
      const errorMessage = error instanceof Error ? error.message : "فشل في رفض الطلب";
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive"
      });
      return { success: false, error: errorMessage };
    }
  };

  return {
    deposits,
    loading,
    fetchDeposits,
    approveDeposit,
    rejectDeposit,
    page,
    setPage,
    totalCount,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize)
  };
};