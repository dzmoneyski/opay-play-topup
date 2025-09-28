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

  console.log('ProtectedRoute:', { 
    user: !!user, 
    authLoading, 
    profileLoading,
    profileExists: !!profile,
    requireActivation,
    isActivated: profile?.is_account_activated 
  });

  // Only show loading if auth is actually loading
  if (authLoading) {
    return <LoadingScreen />;
  }

  // If no user after auth loading is complete, redirect to auth
  if (!user) {
    console.log('No user found, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // Only redirect to activation if explicitly required AND we have profile data AND not activated
  if (requireActivation && profile && !profile.is_account_activated) {
    console.log('Account not activated, redirecting to activate');
    return <Navigate to="/activate" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;