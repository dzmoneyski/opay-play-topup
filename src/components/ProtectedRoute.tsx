import { useAuth } from '@/hooks/useAuth';

import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireActivation?: boolean;
}

const ProtectedRoute = ({ children, requireActivation = false }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Activation check disabled by default; enable when requireActivation is true in routes
  // if (requireActivation && profile && !profile.is_account_activated) {
  //   return <Navigate to="/activate" replace />;
  // }

  return <>{children}</>;
};

export default ProtectedRoute;