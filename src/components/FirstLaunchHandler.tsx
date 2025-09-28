import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface FirstLaunchHandlerProps {
  children: React.ReactNode;
}

const FirstLaunchHandler = ({ children }: FirstLaunchHandlerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // wait for auth to resolve

    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');

    // If user is authenticated, never force Welcome; redirect away if currently there
    if (user) {
      if (location.pathname === '/welcome') {
        navigate('/', { replace: true });
      }
      return;
    }

    // Only unauthenticated users are redirected to Welcome
    if (!hasSeenWelcome && location.pathname !== '/welcome') {
      navigate('/welcome', { replace: true });
    }
  }, [navigate, location.pathname, user, loading]);

  return <>{children}</>;
};

export default FirstLaunchHandler;