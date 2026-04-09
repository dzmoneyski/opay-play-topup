import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface AgentEarnings {
  totalApprovedAmount: number;
  totalFeesCollected: number;
  netDue: number;
  approvedOrders: number;
  pendingOrders: number;
  // Per-service
  phoneTopup: { amount: number; fees: number; orders: number };
  gameTopup: { amount: number; fees: number; orders: number };
}

const emptyEarnings: AgentEarnings = {
  totalApprovedAmount: 0,
  totalFeesCollected: 0,
  netDue: 0,
  approvedOrders: 0,
  pendingOrders: 0,
  phoneTopup: { amount: 0, fees: 0, orders: 0 },
  gameTopup: { amount: 0, fees: 0, orders: 0 },
};

export const useAgentEarnings = () => {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<AgentEarnings>(emptyEarnings);
  const [loading, setLoading] = useState(true);

  const fetchEarnings = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [phoneResult, gameResult] = await Promise.all([
        supabase
          .from('phone_topup_orders')
          .select('amount, fee_amount, status')
          .eq('processed_by', user.id),
        supabase
          .from('game_topup_orders')
          .select('amount, status')
          .eq('processed_by', user.id),
      ]);

      const phoneOrders = phoneResult.data || [];
      const gameOrders = gameResult.data || [];

      // Phone topup stats
      const phoneApproved = phoneOrders.filter(o => o.status === 'approved');
      const phoneAmount = phoneApproved.reduce((sum, o) => sum + Number(o.amount), 0);
      const phoneFees = phoneApproved.reduce((sum, o) => sum + Number(o.fee_amount || 0), 0);

      // Game topup stats (approved or completed)
      const gameApproved = gameOrders.filter(o => o.status === 'approved' || o.status === 'completed');
      const gameAmount = gameApproved.reduce((sum, o) => sum + Number(o.amount), 0);

      const totalApproved = phoneAmount + gameAmount;
      const totalFees = phoneFees;
      const netDue = totalApproved + totalFees;

      const pendingPhone = phoneOrders.filter(o => o.status === 'pending').length;
      const pendingGame = gameOrders.filter(o => o.status === 'pending').length;

      setEarnings({
        totalApprovedAmount: totalApproved,
        totalFeesCollected: totalFees,
        netDue,
        approvedOrders: phoneApproved.length + gameApproved.length,
        pendingOrders: pendingPhone + pendingGame,
        phoneTopup: { amount: phoneAmount, fees: phoneFees, orders: phoneApproved.length },
        gameTopup: { amount: gameAmount, fees: 0, orders: gameApproved.length },
      });
    } catch (error) {
      console.error('Error fetching agent earnings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  return { earnings, loading, refetch: fetchEarnings };
};
