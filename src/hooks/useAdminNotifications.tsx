import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface NotificationCounts {
  pendingVerifications: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  pendingBetting: number;
  pendingBettingVerifications: number;
  pendingGames: number;
  pendingDigitalCards: number;
  pendingPhoneTopups: number;
  fraudAttempts: number;
  fraudAttemptsToday: number;
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
    pendingDigitalCards: 0,
    pendingPhoneTopups: 0,
    fraudAttempts: 0,
    fraudAttemptsToday: 0,
    total: 0
  });
  const [loading, setLoading] = React.useState(true);
  const prevFraudCount = React.useRef<number>(0);

  const fetchCounts = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [verifications, deposits, withdrawals, betting, bettingVerifications, games, digitalCards, phoneTopups, fraudTotal, fraudToday] = await Promise.all([
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
          .eq('status', 'pending'),
        supabase
          .from('digital_card_orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('phone_topup_orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('fraud_attempts')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('fraud_attempts')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', today.toISOString())
      ]);

      const newFraudCount = fraudTotal.count || 0;

      const newCounts = {
        pendingVerifications: verifications.count || 0,
        pendingDeposits: deposits.count || 0,
        pendingWithdrawals: withdrawals.count || 0,
        pendingBetting: betting.count || 0,
        pendingBettingVerifications: bettingVerifications.count || 0,
        pendingGames: games.count || 0,
        pendingDigitalCards: digitalCards.count || 0,
        pendingPhoneTopups: phoneTopups.count || 0,
        fraudAttempts: newFraudCount,
        fraudAttemptsToday: fraudToday.count || 0,
        total: (verifications.count || 0) + (deposits.count || 0) + (withdrawals.count || 0) + (betting.count || 0) + (bettingVerifications.count || 0) + (games.count || 0) + (digitalCards.count || 0) + (phoneTopups.count || 0)
      };

      // Show urgent toast if new fraud attempt detected
      if (newFraudCount > prevFraudCount.current && prevFraudCount.current > 0) {
        toast({
          title: "⚠️ تنبيه أمني عاجل!",
          description: "تم رصد محاولة احتيال جديدة! اضغط لعرض التفاصيل",
          variant: "destructive",
          duration: 10000,
        });
      }
      prevFraudCount.current = newFraudCount;

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
        .subscribe(),
      supabase
        .channel('digital-cards-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_card_orders' }, fetchCounts)
        .subscribe(),
      supabase
        .channel('phone-topups-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'phone_topup_orders' }, fetchCounts)
        .subscribe(),
      supabase
        .channel('fraud-attempts-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fraud_attempts' }, () => {
          // Immediate alert on new fraud attempt
          toast({
            title: "🚨 تحذير! محاولة احتيال!",
            description: "تم رصد نشاط مشبوه الآن! راجع صفحة محاولات الاحتيال فوراً",
            variant: "destructive",
            duration: 15000,
          });
          fetchCounts();
        })
        .subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  return { counts, loading, refetch: fetchCounts };
};
