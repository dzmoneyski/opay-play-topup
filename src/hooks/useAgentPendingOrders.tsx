import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useAgentPermissions } from './useAgentPermissions';
import { supabase } from '@/integrations/supabase/client';

interface PendingOrdersCounts {
  gameTopups: number;
  betting: number;
  phoneTopups: number;
  total: number;
}

export const useAgentPendingOrders = () => {
  const { user } = useAuth();
  const { isAgent, canManageGameTopups, canManageBetting, canManagePhoneTopups, loading: permissionsLoading } = useAgentPermissions();
  const [counts, setCounts] = useState<PendingOrdersCounts>({
    gameTopups: 0,
    betting: 0,
    phoneTopups: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    // Don't require isAgent to be true yet - permissions might still be loading
    if (!user) {
      setCounts({ gameTopups: 0, betting: 0, phoneTopups: 0, total: 0 });
      setLoading(false);
      return;
    }

    // Wait for permissions to load before deciding
    if (permissionsLoading) {
      return;
    }

    // If not an agent, set empty counts
    if (!isAgent) {
      setCounts({ gameTopups: 0, betting: 0, phoneTopups: 0, total: 0 });
      setLoading(false);
      return;
    }

    try {
      let gameTopupsCount = 0;
      let bettingCount = 0;
      let phoneTopupsCount = 0;

      console.log('Agent permissions:', { canManageGameTopups, canManageBetting, canManagePhoneTopups });

      // Fetch pending game topup orders if agent has permission
      if (canManageGameTopups) {
        const { count, error } = await supabase
          .from('game_topup_orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        if (!error && count !== null) {
          gameTopupsCount = count;
        }
        console.log('Game topups count:', count, error);
      }

      // Fetch pending betting transactions if agent has permission
      if (canManageBetting) {
        const { count, error } = await supabase
          .from('betting_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        if (!error && count !== null) {
          bettingCount = count;
        }
        console.log('Betting count:', count, error);
      }

      // Fetch pending phone topup orders if agent has permission
      if (canManagePhoneTopups) {
        const { count, error } = await supabase
          .from('phone_topup_orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        if (!error && count !== null) {
          phoneTopupsCount = count;
        }
        console.log('Phone topups count:', count, error);
      }

      const total = gameTopupsCount + bettingCount + phoneTopupsCount;
      console.log('Total pending orders:', total);

      setCounts({
        gameTopups: gameTopupsCount,
        betting: bettingCount,
        phoneTopups: phoneTopupsCount,
        total
      });
    } catch (error) {
      console.error('Error fetching agent pending orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!permissionsLoading && user) {
      fetchCounts();
    }
  }, [user, isAgent, canManageGameTopups, canManageBetting, canManagePhoneTopups, permissionsLoading]);

  // Set up real-time subscriptions for all relevant tables
  useEffect(() => {
    if (!user || !isAgent || permissionsLoading) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Subscribe to game topup orders changes
    if (canManageGameTopups) {
      const gameChannel = supabase
        .channel('agent-game-orders-count')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'game_topup_orders'
        }, () => {
          fetchCounts();
        })
        .subscribe();
      channels.push(gameChannel);
    }

    // Subscribe to betting transactions changes
    if (canManageBetting) {
      const bettingChannel = supabase
        .channel('agent-betting-orders-count')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'betting_transactions'
        }, () => {
          fetchCounts();
        })
        .subscribe();
      channels.push(bettingChannel);
    }

    // Subscribe to phone topup orders changes
    if (canManagePhoneTopups) {
      const phoneChannel = supabase
        .channel('agent-phone-orders-count')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'phone_topup_orders'
        }, () => {
          fetchCounts();
        })
        .subscribe();
      channels.push(phoneChannel);
    }

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, isAgent, canManageGameTopups, canManageBetting, canManagePhoneTopups, permissionsLoading]);

  return {
    counts,
    loading: loading || permissionsLoading,
    refetch: fetchCounts
  };
};
