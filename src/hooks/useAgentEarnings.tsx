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
      const [phoneResult, gameResult, operatorsResult, settlementsResult] = await Promise.all([
        supabase
          .from('phone_topup_orders')
          .select('amount, fee_amount, status, operator_id')
          .eq('processed_by', user.id),
        supabase
          .from('game_topup_orders')
          .select('amount, status')
          .eq('processed_by', user.id),
        supabase
          .from('phone_operators')
          .select('id, fee_type, fee_value, fee_min, fee_max'),
        supabase
          .from('agent_settlements')
          .select('amount')
          .eq('agent_id', user.id),
      ]);

      const phoneOrders = phoneResult.data || [];
      const gameOrders = gameResult.data || [];
      const operators = operatorsResult.data || [];
      const settlements = settlementsResult.data || [];
      const totalSettled = settlements.reduce((sum, s) => sum + Number(s.amount), 0);

      // Build operator fee lookup
      const opMap = new Map(operators.map(op => [op.id, op]));

      // Calculate fee dynamically from operator settings
      const calcFee = (amount: number, operatorId: string): number => {
        const op = opMap.get(operatorId);
        if (!op) return 0;
        let fee = op.fee_type === 'percentage' 
          ? (amount * Number(op.fee_value) / 100)
          : Number(op.fee_value);
        fee = Math.max(fee, Number(op.fee_min || 0));
        if (op.fee_max) fee = Math.min(fee, Number(op.fee_max));
        return fee;
      };

      // Phone topup stats
      const phoneApproved = phoneOrders.filter(o => o.status === 'approved');
      const phoneAmount = phoneApproved.reduce((sum, o) => sum + Number(o.amount), 0);
      const phoneFees = phoneApproved.reduce((sum, o) => {
        const dbFee = Number(o.fee_amount || 0);
        return sum + (dbFee > 0 ? dbFee : calcFee(Number(o.amount), o.operator_id));
      }, 0);

      // Game topup stats (approved or completed)
      const gameApproved = gameOrders.filter(o => o.status === 'approved' || o.status === 'completed');
      const gameAmount = gameApproved.reduce((sum, o) => sum + Number(o.amount), 0);

      const totalApproved = phoneAmount + gameAmount;
      const netDue = totalApproved + totalFees - totalSettled;

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
