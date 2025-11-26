import React from 'react';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useToast } from '@/hooks/use-toast';
import { AdminNavbar } from '@/components/AdminNavbar';
import { AdminAlertBanner } from '@/components/AdminAlertBanner';
import AdminDashboard from '@/pages/admin/Dashboard';
import VerifyUsers from '@/pages/admin/VerifyUsers';
import UsersPage from '@/pages/admin/Users';
import DepositsPage from '@/pages/admin/Deposits';
import WithdrawalsPage from '@/pages/admin/Withdrawals';
import TransfersPage from '@/pages/admin/Transfers';
import CardsPage from '@/pages/admin/Cards';
import GameManagement from '@/pages/admin/GameManagement';
import BettingManagement from '@/pages/admin/BettingManagement';
import MerchantManagement from '@/pages/admin/MerchantManagement';
import SettingsPage from '@/pages/admin/Settings';
import DigitalCardsPage from '@/pages/admin/DigitalCards';
import AliExpressOrders from '@/pages/admin/AliExpressOrders';
import DiasporaTransfers from '@/pages/admin/DiasporaTransfers';
import SuspiciousReferralsPage from '@/pages/admin/SuspiciousReferrals';
import FraudulentUsersPage from '@/pages/admin/FraudulentUsers';
import CardDeliveryOrders from '@/pages/admin/CardDeliveryOrders';

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
    <div className="min-h-screen bg-background">
      <AdminNavbar />
      
      <main className="container mx-auto px-4 py-6">
        <AdminAlertBanner />
        
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="identity-verification" element={<VerifyUsers />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="deposits" element={<DepositsPage />} />
          <Route path="withdrawals" element={<WithdrawalsPage />} />
          <Route path="transfers" element={<TransfersPage />} />
          <Route path="cards" element={<CardsPage />} />
          <Route path="card-delivery" element={<CardDeliveryOrders />} />
          <Route path="digital-cards" element={<DigitalCardsPage />} />
          <Route path="games" element={<GameManagement />} />
          <Route path="betting" element={<BettingManagement />} />
          <Route path="merchants" element={<MerchantManagement />} />
          <Route path="aliexpress" element={<AliExpressOrders />} />
          <Route path="diaspora" element={<DiasporaTransfers />} />
          <Route path="suspicious-referrals" element={<SuspiciousReferralsPage />} />
          <Route path="fraudulent-users" element={<FraudulentUsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminPanel;