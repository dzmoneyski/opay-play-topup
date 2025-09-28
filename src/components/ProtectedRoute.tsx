import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Navigate } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireActivation?: boolean;
}

const ProtectedRoute = ({ children, requireActivation = false }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (authLoading || profileLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Only redirect to activation if explicitly required
  if (requireActivation && profile && !profile.is_account_activated) {
    return <Navigate to="/activate" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;