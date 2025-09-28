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
  const [loading, setLoading] = React.useState(true);
  const { user } = useAuth();

  const fetchBalance = React.useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    console.log('Fetching balance for user:', user.id);
    setLoading(true);
    try {
      // Fetch the current balance
      const { data, error } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Balance fetch error:', error);
        // Don't throw, just set default balance
        setBalance({
          id: 'temp',
          user_id: user.id,
          balance: 0.00,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        return;
      }

      if (data) {
        console.log('Balance found:', data.balance);
        setBalance(data);
      } else {
        console.log('No balance data found, setting default');
        // Set default balance without trying to create in DB
        setBalance({
          id: 'temp',
          user_id: user.id,
          balance: 0.00,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Exception fetching balance:', error);
      // Set a default balance for display on error
      setBalance({
        id: 'temp',
        user_id: user.id,
        balance: 0.00,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    console.log('useBalance effect triggered, user:', !!user);
    if (user) {
      fetchBalance();
    } else {
      setBalance(null);
      setLoading(false);
    }
  }, [user, fetchBalance]);

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
          console.log('Real-time balance update received');
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