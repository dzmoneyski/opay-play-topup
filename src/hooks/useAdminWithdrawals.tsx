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

export interface DailyStats {
  date: string;
  pendingCount: number;
  pendingAmount: number;
  completedCount: number;
  completedAmount: number;
  totalCount: number;
  totalAmount: number;
}

export interface WithdrawalStats {
  totalAmount: number;
  completedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalFees: number;
  dailyStats: DailyStats[];
}

export const useAdminWithdrawals = () => {
  const [withdrawals, setWithdrawals] = React.useState<AdminWithdrawal[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [stats, setStats] = React.useState<WithdrawalStats>({
    totalAmount: 0,
    completedAmount: 0,
    pendingAmount: 0,
    rejectedAmount: 0,
    totalCount: 0,
    completedCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalFees: 0,
    dailyStats: []
  });
  const [page, setPage] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const pageSize = 20;
  const { user } = useAuth();
  const { toast } = useToast();

  // جلب الإحصائيات الكاملة من قاعدة البيانات
  const fetchStats = React.useCallback(async () => {
    if (!user) return;
    
    try {
      // جلب كل السحوبات للإحصائيات (بدون تصفح)
      const { data: allWithdrawals, error } = await supabase
        .from('withdrawals')
        .select('amount, fee_amount, status, created_at');
      
      if (error) throw error;
      
      if (allWithdrawals) {
        const newStats: WithdrawalStats = {
          totalAmount: 0,
          completedAmount: 0,
          pendingAmount: 0,
          rejectedAmount: 0,
          totalCount: allWithdrawals.length,
          completedCount: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
          totalFees: 0,
          dailyStats: []
        };
        
        // لحساب الإحصائيات اليومية
        const dailyMap: Record<string, DailyStats> = {};
        
        allWithdrawals.forEach(w => {
          newStats.totalAmount += w.amount || 0;
          
          // استخراج التاريخ
          const date = new Date(w.created_at).toISOString().split('T')[0];
          if (!dailyMap[date]) {
            dailyMap[date] = {
              date,
              pendingCount: 0,
              pendingAmount: 0,
              completedCount: 0,
              completedAmount: 0,
              totalCount: 0,
              totalAmount: 0
            };
          }
          dailyMap[date].totalCount++;
          dailyMap[date].totalAmount += w.amount || 0;
          
          if (w.status === 'completed') {
            newStats.completedAmount += w.amount || 0;
            newStats.completedCount++;
            newStats.totalFees += w.fee_amount || 0;
            dailyMap[date].completedCount++;
            dailyMap[date].completedAmount += w.amount || 0;
          } else if (w.status === 'pending') {
            newStats.pendingAmount += w.amount || 0;
            newStats.pendingCount++;
            dailyMap[date].pendingCount++;
            dailyMap[date].pendingAmount += w.amount || 0;
          } else if (w.status === 'approved') {
            newStats.approvedCount++;
            newStats.pendingAmount += w.amount || 0;
            dailyMap[date].pendingCount++;
            dailyMap[date].pendingAmount += w.amount || 0;
          } else if (w.status === 'rejected') {
            newStats.rejectedAmount += w.amount || 0;
            newStats.rejectedCount++;
          }
        });
        
        // تحويل الخريطة إلى مصفوفة مرتبة بالتاريخ (الأحدث أولاً)
        newStats.dailyStats = Object.values(dailyMap).sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        setStats(newStats);
      }
    } catch (error) {
      console.error('Error fetching withdrawal stats:', error);
    }
  }, [user]);

  const fetchWithdrawals = React.useCallback(async (fetchAll: boolean = false) => {
    if (!user) return;
    
    setLoading(true);
    try {
      if (fetchAll) {
        const { data: withdrawalsData, error: withdrawalsError, count } = await supabase
          .from('withdrawals')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (withdrawalsError) throw withdrawalsError;
        setTotalCount(count || 0);

        if (!withdrawalsData || withdrawalsData.length === 0) {
          setWithdrawals([]);
          return;
        }

        const userIds = [...new Set(withdrawalsData.map(w => w.user_id))];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        const formattedData = withdrawalsData.map(withdrawal => ({
          ...withdrawal,
          user_profile: {
            full_name: profilesData?.find(p => p.user_id === withdrawal.user_id)?.full_name || 'غير محدد',
            phone: profilesData?.find(p => p.user_id === withdrawal.user_id)?.phone || 'غير محدد'
          }
        }));
        
        setWithdrawals(formattedData as AdminWithdrawal[]);
        return;
      }

      // Pending-first pagination
      const { count: totalCountResult } = await supabase
        .from('withdrawals')
        .select('*', { count: 'exact', head: true });

      setTotalCount(totalCountResult || 0);

      let withdrawalsData: any[] = [];

      if (page === 1) {
        const { data: pendingData } = await supabase
          .from('withdrawals')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        withdrawalsData = pendingData || [];

        const remaining = pageSize - withdrawalsData.length;
        if (remaining > 0) {
          const { data: otherData } = await supabase
            .from('withdrawals')
            .select('*')
            .neq('status', 'pending')
            .order('created_at', { ascending: false })
            .range(0, remaining - 1);

          withdrawalsData = [...withdrawalsData, ...(otherData || [])];
        }
      } else {
        const { count: pendingCount } = await supabase
          .from('withdrawals')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        const adjustedFrom = (page - 1) * pageSize - (pendingCount || 0);
        const adjustedTo = adjustedFrom + pageSize - 1;

        const { data: otherData } = await supabase
          .from('withdrawals')
          .select('*')
          .neq('status', 'pending')
          .order('created_at', { ascending: false })
          .range(Math.max(0, adjustedFrom), Math.max(0, adjustedTo));

        withdrawalsData = otherData || [];
      }

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
    if (!user) throw new Error('غير مصرح');

    const { error } = await supabase.rpc('approve_withdrawal', {
      _withdrawal_id: withdrawalId,
      _admin_id: user.id,
      _notes: notes || null
    });

    if (error) {
      console.error('Error approving withdrawal:', error);
      throw error;
    }

    // إعادة تحديث القائمة
    await fetchWithdrawals();
  }, [user, fetchWithdrawals]);

  const rejectWithdrawal = React.useCallback(async (withdrawalId: string, reason: string) => {
    if (!user) throw new Error('غير مصرح');

    const { error } = await supabase.rpc('reject_withdrawal', {
      _withdrawal_id: withdrawalId,
      _admin_id: user.id,
      _reason: reason
    });

    if (error) {
      console.error('Error rejecting withdrawal:', error);
      throw error;
    }

    // إعادة تحديث القائمة
    await fetchWithdrawals();
  }, [user, fetchWithdrawals]);

  React.useEffect(() => {
    fetchWithdrawals();
    fetchStats();
  }, [fetchWithdrawals, fetchStats]);

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
    stats,
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