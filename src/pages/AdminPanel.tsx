import React from 'react';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/AdminSidebar';
import AdminDashboard from '@/pages/admin/Dashboard';
import IdentityVerificationPage from '@/pages/admin/IdentityVerification';
import UsersPage from '@/pages/admin/Users';
import DepositsPage from '@/pages/admin/Deposits';
import WithdrawalsPage from '@/pages/admin/Withdrawals';
import TransfersPage from '@/pages/admin/Transfers';
import CardsPage from '@/pages/admin/Cards';
import GameManagement from '@/pages/admin/GameManagement';
import SettingsPage from '@/pages/admin/Settings';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useUserRoles();
  const { toast } = useToast();

  React.useEffect(() => {
    if (!loading && !isAdmin) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية للوصول إلى هذه الصفحة",
        variant: "destructive"
      });
      navigate('/dashboard');
    }
  }, [isAdmin, loading, navigate, toast]);

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

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-card shadow-sm border-b p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>العودة للوحة التحكم</span>
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 p-6">
            <Routes>
              <Route index element={<AdminDashboard />} />
              <Route path="identity-verification" element={<IdentityVerificationPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="deposits" element={<DepositsPage />} />
              <Route path="withdrawals" element={<WithdrawalsPage />} />
              <Route path="transfers" element={<TransfersPage />} />
              <Route path="cards" element={<CardsPage />} />
              <Route path="games" element={<GameManagement />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminPanel;