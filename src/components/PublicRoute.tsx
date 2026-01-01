import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Allow authenticated users to access /auth only for password recovery flow
  const params = new URLSearchParams(location.search);
  const isPasswordResetFlow = params.get('reset') === 'true';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (user && !isPasswordResetFlow) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;