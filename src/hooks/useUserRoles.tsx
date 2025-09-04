import React from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
}

export const useUserRoles = () => {
  const { user } = useAuth();
  const [roles, setRoles] = React.useState<UserRole[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      fetchUserRoles();
    } else {
      setRoles([]);
      setIsAdmin(false);
      setLoading(false);
    }
  }, [user]);

  const fetchUserRoles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        return;
      }

      setRoles(data as UserRole[]);
      const adminRole = data?.find(role => role.role === 'admin');
      setIsAdmin(!!adminRole);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: 'admin' | 'user') => {
    return roles.some(userRole => userRole.role === role);
  };

  return {
    roles,
    loading,
    isAdmin,
    hasRole,
    refetch: fetchUserRoles
  };
};