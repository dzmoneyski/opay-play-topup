import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
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
}

export const useWithdrawals = () => {
  const [withdrawals, setWithdrawals] = React.useState<Withdrawal[]>([]);
  const [loading, setLoading] = React.useState(false);
  const { user, session } = useAuth();

  const fetchWithdrawals = React.useCallback(async () => {
    if (!user || !session) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, session]);

  const createWithdrawal = React.useCallback(async (withdrawalData: {
    amount: number;
    withdrawal_method: string;
    account_number?: string;
    account_holder_name?: string;
    cash_location?: string;
    notes?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('withdrawals')
      .insert({
        user_id: user.id,
        ...withdrawalData
      })
      .select()
      .single();

    if (error) throw error;
    
    // إعادة تحديث قائمة السحب
    await fetchWithdrawals();
    
    return data;
  }, [user?.id, session, fetchWithdrawals]);

  React.useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  // إضافة اشتراك في الوقت الفعلي لتحديثات السحب
  React.useEffect(() => {
    if (!user || !session) return;

    const channel = supabase
      .channel('withdrawal-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdrawals',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchWithdrawals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, session, fetchWithdrawals]);

  return {
    withdrawals,
    loading,
    createWithdrawal,
    fetchWithdrawals
  };
};