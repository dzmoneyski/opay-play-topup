import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AgentPermissions {
  id: string;
  user_id: string;
  can_manage_game_topups: boolean;
  can_manage_betting: boolean;
  can_view_orders: boolean;
  daily_limit: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useAgentPermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<AgentPermissions | null>(null);
  const [isAgent, setIsAgent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkAgentStatus();
    } else {
      setPermissions(null);
      setIsAgent(false);
      setLoading(false);
    }
  }, [user]);

  const checkAgentStatus = async () => {
    if (!user) return;

    try {
      // Check if user has agent role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', 'agent')
        .maybeSingle();

      if (roleError) {
        console.error('Error checking agent role:', roleError);
        setLoading(false);
        return;
      }

      setIsAgent(!!roleData);

      if (roleData) {
        // Fetch agent permissions
        const { data: permData, error: permError } = await supabase
          .from('agent_permissions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (permError) {
          console.error('Error fetching agent permissions:', permError);
        } else {
          setPermissions(permData as AgentPermissions);
        }
      }
    } catch (error) {
      console.error('Error checking agent status:', error);
    } finally {
      setLoading(false);
    }
  };

  const canManageGameTopups = permissions?.can_manage_game_topups ?? false;
  const canManageBetting = permissions?.can_manage_betting ?? false;
  const canViewOrders = permissions?.can_view_orders ?? false;

  return {
    isAgent,
    permissions,
    loading,
    canManageGameTopups,
    canManageBetting,
    canViewOrders,
    refetch: checkAgentStatus
  };
};
