import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserBalance {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export const useBalance = () => {
  const [balance, setBalance] = React.useState<UserBalance | null>(null);
  const [loading, setLoading] = React.useState(false);
  const { user } = useAuth();

  const fetchBalance = React.useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // First, recalculate balance based on approved deposits
      await supabase.rpc('recalculate_user_balance', { _user_id: user.id });
      
      // Then fetch the updated balance
      const { data, error } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // If no balance exists yet (e.g., before any transactions), just keep it null
      // It will appear automatically after first deposit/transfer or after next recalc when authenticated
      setBalance(data ?? null);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Add real-time subscription for balance updates
  React.useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('balance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_balances',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchBalance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchBalance]);

  return {
    balance,
    loading,
    fetchBalance
  };
};