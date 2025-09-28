import React from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cross-tab leader election to avoid hitting /token rate limits
  React.useEffect(() => {
    const LEADER_KEY = 'auth_leader_v1';
    const HEARTBEAT_MS = 10000; // renew every 10s
    const STALE_MS = 25000; // leader considered stale after 25s
    const leaderId = Math.random().toString(36).slice(2);
    let heartbeatTimer: number | undefined;

    const isLeaderRecordAlive = (raw: string | null) => {
      if (!raw) return false;
      try {
        const v = JSON.parse(raw) as { id: string; ts: number };
        return Date.now() - v.ts < STALE_MS;
      } catch { return false; }
    };

    const becomeLeader = () => {
      localStorage.setItem(LEADER_KEY, JSON.stringify({ id: leaderId, ts: Date.now() }));
      const anyAuth = (supabase.auth as unknown as { startAutoRefresh?: () => void; stopAutoRefresh?: () => void });
      anyAuth.startAutoRefresh?.();
      // Heartbeat
      heartbeatTimer = window.setInterval(() => {
        localStorage.setItem(LEADER_KEY, JSON.stringify({ id: leaderId, ts: Date.now() }));
      }, HEARTBEAT_MS) as unknown as number;
    };

    const resignLeadership = () => {
      const current = localStorage.getItem(LEADER_KEY);
      try {
        const v = current ? JSON.parse(current) as { id: string } : null;
        if (v?.id === leaderId) localStorage.removeItem(LEADER_KEY);
      } catch {}
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
      const anyAuth = (supabase.auth as unknown as { startAutoRefresh?: () => void; stopAutoRefresh?: () => void });
      anyAuth.stopAutoRefresh?.();
    };

    const elect = () => {
      const current = localStorage.getItem(LEADER_KEY);
      if (!isLeaderRecordAlive(current)) {
        becomeLeader();
      } else {
        // Follow mode: ensure auto refresh is stopped in followers
        const anyAuth = (supabase.auth as unknown as { stopAutoRefresh?: () => void });
        anyAuth.stopAutoRefresh?.();
      }
    };

    // Try to elect on mount
    elect();

    // React to storage changes
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LEADER_KEY) return;
      const current = localStorage.getItem(LEADER_KEY);
      if (!isLeaderRecordAlive(current)) {
        // Leader stale -> attempt to become leader
        becomeLeader();
      } else {
        // Someone else is leader -> be follower
        if (heartbeatTimer) window.clearInterval(heartbeatTimer);
        const anyAuth = (supabase.auth as unknown as { stopAutoRefresh?: () => void });
        anyAuth.stopAutoRefresh?.();
      }
    };
    window.addEventListener('storage', onStorage);

    // Cleanup
    const onUnload = () => resignLeadership();
    window.addEventListener('beforeunload', onUnload);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('beforeunload', onUnload);
      resignLeadership();
    };
  }, []);

  const signUp = React.useCallback(async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });
    return { error };
  }, []);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  }, []);

  const signOut = React.useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const value = React.useMemo(() => ({
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut
  }), [user, session, loading, signUp, signIn, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};