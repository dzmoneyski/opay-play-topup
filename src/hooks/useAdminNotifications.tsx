import React from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NotificationCounts {
  pendingVerifications: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  pendingBetting: number;
  pendingBettingVerifications: number;
  pendingGames: number;
  total: number;
}

export const useAdminNotifications = () => {
  const [counts, setCounts] = React.useState<NotificationCounts>({
    pendingVerifications: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    pendingBetting: 0,
    pendingBettingVerifications: 0,
    pendingGames: 0,
    total: 0
  });
  const [loading, setLoading] = React.useState(true);

  const fetchCounts = async () => {
    try {
      const [verifications, deposits, withdrawals, betting, bettingVerifications, games] = await Promise.all([
        supabase
          .from('verification_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('deposits')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('withdrawals')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('betting_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('betting_accounts')
          .select('id', { count: 'exact', head: true })
          .eq('is_verified', false),
        supabase
          .from('game_topup_orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
      ]);

      const newCounts = {
        pendingVerifications: verifications.count || 0,
        pendingDeposits: deposits.count || 0,
        pendingWithdrawals: withdrawals.count || 0,
        pendingBetting: betting.count || 0,
        pendingBettingVerifications: bettingVerifications.count || 0,
        pendingGames: games.count || 0,
        total: (verifications.count || 0) + (deposits.count || 0) + (withdrawals.count || 0) + (betting.count || 0) + (bettingVerifications.count || 0) + (games.count || 0)
      };

      setCounts(newCounts);
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCounts();

    // Subscribe to real-time updates
    const channels = [
      supabase
        .channel('verification-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'verification_requests' }, fetchCounts)
        .subscribe(),
      supabase
        .channel('deposits-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits' }, fetchCounts)
        .subscribe(),
      supabase
        .channel('withdrawals-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, fetchCounts)
        .subscribe(),
      supabase
        .channel('betting-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'betting_transactions' }, fetchCounts)
        .subscribe(),
      supabase
        .channel('betting-accounts-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'betting_accounts' }, fetchCounts)
        .subscribe(),
      supabase
        .channel('games-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_topup_orders' }, fetchCounts)
        .subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  return { counts, loading, refetch: fetchCounts };
};
