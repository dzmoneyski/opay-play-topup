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
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch the current balance
      const { data, error } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If no balance exists, create one
      if (!data) {
        const { data: newBalance, error: insertError } = await supabase
          .from('user_balances')
          .insert({
            user_id: user.id,
            balance: 0.00
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating balance:', insertError);
          // If insert fails, set a default balance for display
          setBalance({
            id: 'temp',
            user_id: user.id,
            balance: 0.00,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        } else {
          setBalance(newBalance);
        }
      } else {
        setBalance(data);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      // Set a default balance for display on error
      setBalance({
        id: 'temp',
        user_id: user?.id || '',
        balance: 0.00,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
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