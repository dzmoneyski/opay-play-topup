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
  const { user, session } = useAuth();

  const fetchBalance = React.useCallback(async () => {
    if (!user || !session) return;
    
    setLoading(true);
    try {
      // Fetch the current balance only (avoid RPC loops)
      const { data, error } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // No balance row yet -> show 0.00 without inserting (RLS-safe)
        setBalance({
          id: 'placeholder',
          user_id: user.id,
          balance: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any);
      } else {
        setBalance(data);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      // Fallback to 0.00 to avoid blocking UX
      setBalance({
        id: 'placeholder',
        user_id: user!.id,
        balance: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any);
    } finally {
      setLoading(false);
    }
  }, [user, session]);

  React.useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Add real-time subscription for balance updates
  React.useEffect(() => {
    if (!user || !session) return;

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
  }, [user, session, fetchBalance]);

  return {
    balance,
    loading,
    fetchBalance
  };
};