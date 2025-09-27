import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface FirstLaunchHandlerProps {
  children: React.ReactNode;
}

const FirstLaunchHandler = ({ children }: FirstLaunchHandlerProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    
    // إذا لم يشاهد المستخدم شاشة الترحيب ولم يكن في صفحة الترحيب
    if (!hasSeenWelcome && location.pathname !== '/welcome') {
      navigate('/welcome', { replace: true });
    }
  }, [navigate, location.pathname]);

  return <>{children}</>;
};

export default FirstLaunchHandler;