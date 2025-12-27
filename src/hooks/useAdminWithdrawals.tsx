import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface AdminWithdrawal {
  id: string;
  user_id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  fee_percentage: number;
  fee_fixed: number;
  withdrawal_method: string;
  account_number?: string;
  account_holder_name?: string;
  cash_location?: string;
  status: string;
  notes?: string;
  admin_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
  // بيانات المستخدم
  user_profile: {
    full_name: string;
    phone: string;
  };
}

export const useAdminWithdrawals = () => {
  const [withdrawals, setWithdrawals] = React.useState<AdminWithdrawal[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const pageSize = 20;
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchWithdrawals = React.useCallback(async (fetchAll: boolean = false) => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('withdrawals')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // إذا لم يكن جلب الكل، نستخدم التصفح
      if (!fetchAll) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data: withdrawalsData, error: withdrawalsError, count } = await query;

      if (withdrawalsError) throw withdrawalsError;
      setTotalCount(count || 0);

      if (!withdrawalsData || withdrawalsData.length === 0) {
        setWithdrawals([]);
        return;
      }

      // جلب بيانات المستخدمين
      const userIds = [...new Set(withdrawalsData.map(w => w.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // دمج البيانات
      const formattedData = withdrawalsData.map(withdrawal => {
        const profile = profilesData?.find(p => p.user_id === withdrawal.user_id);
        return {
          ...withdrawal,
          user_profile: {
            full_name: profile?.full_name || 'غير محدد',
            phone: profile?.phone || 'غير محدد'
          }
        };
      });
      
      setWithdrawals(formattedData as AdminWithdrawal[]);
    } catch (error) {
      console.error('Error fetching admin withdrawals:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب بيانات السحب",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast, page]);

  const approveWithdrawal = React.useCallback(async (withdrawalId: string, notes?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('approve_withdrawal', {
        _withdrawal_id: withdrawalId,
        _admin_id: user.id,
        _notes: notes || null
      });

      if (error) throw error;

      toast({
        title: "تم قبول طلب السحب",
        description: "تم معالجة الطلب بنجاح وخصم المبلغ من الحساب"
      });

      // إعادة تحديث القائمة
      await fetchWithdrawals();
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      toast({
        title: "خطأ",
        description: "فشل في قبول طلب السحب",
        variant: "destructive"
      });
    }
  }, [user, toast, fetchWithdrawals]);

  const rejectWithdrawal = React.useCallback(async (withdrawalId: string, reason: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('reject_withdrawal', {
        _withdrawal_id: withdrawalId,
        _admin_id: user.id,
        _reason: reason
      });

      if (error) throw error;

      toast({
        title: "تم رفض طلب السحب",
        description: "تم رفض الطلب وإضافة سبب الرفض"
      });

      // إعادة تحديث القائمة
      await fetchWithdrawals();
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      toast({
        title: "خطأ",
        description: "فشل في رفض طلب السحب",
        variant: "destructive"
      });
    }
  }, [user, toast, fetchWithdrawals]);

  React.useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  // Realtime subscription - only refetch on changes
  React.useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('admin-withdrawal-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'withdrawals' },
        () => fetchWithdrawals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchWithdrawals]);

  return {
    withdrawals,
    loading,
    approveWithdrawal,
    rejectWithdrawal,
    fetchWithdrawals,
    page,
    setPage,
    totalCount,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize)
  };
};