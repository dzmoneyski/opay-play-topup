import React from 'react';
import { useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bell, Search, ChevronRight, Home } from 'lucide-react';
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
import BettingManagement from '@/pages/admin/BettingManagement';
import MerchantManagement from '@/pages/admin/MerchantManagement';
import SettingsPage from '@/pages/admin/Settings';

const AdminPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, loading } = useUserRoles();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = React.useState('');

  // Breadcrumb generator
  const getBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter(x => x);
    const breadcrumbNames: Record<string, string> = {
      'admin': 'لوحة التحكم',
      'identity-verification': 'التحقق من الهوية',
      'users': 'المستخدمين',
      'deposits': 'الإيداعات',
      'withdrawals': 'السحوبات',
      'transfers': 'التحويلات',
      'cards': 'البطاقات',
      'games': 'الألعاب',
      'betting': 'المراهنات',
      'merchants': 'التجار',
      'settings': 'الإعدادات',
    };

    return pathnames.map((path, index) => ({
      name: breadcrumbNames[path] || path,
      path: `/${pathnames.slice(0, index + 1).join('/')}`,
      isLast: index === pathnames.length - 1
    }));
  };

  const breadcrumbs = getBreadcrumbs();

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
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Enhanced Header */}
          <header className="bg-card/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-10">
            <div className="px-4 py-3 space-y-3">
              {/* Top Row - Actions */}
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 hover:bg-muted/80"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">العودة للوحة التحكم</span>
                </Button>

                <div className="flex items-center gap-2">
                  {/* Search Bar */}
                  <div className="relative hidden md:block">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث سريع..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10 w-64 bg-background/50"
                    />
                  </div>

                  {/* Notifications */}
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <Badge className="absolute -top-1 -left-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-[10px]">
                      3
                    </Badge>
                  </Button>
                </div>
              </div>

              {/* Breadcrumb Navigation */}
              <nav className="flex items-center gap-2 text-sm text-muted-foreground overflow-x-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin')}
                  className="h-7 px-2 hover:bg-muted/50"
                >
                  <Home className="h-3.5 w-3.5" />
                </Button>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.path}>
                    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => !crumb.isLast && navigate(crumb.path)}
                      className={`h-7 px-2 whitespace-nowrap ${
                        crumb.isLast 
                          ? 'text-foreground font-medium pointer-events-none' 
                          : 'hover:bg-muted/50'
                      }`}
                      disabled={crumb.isLast}
                    >
                      {crumb.name}
                    </Button>
                  </React.Fragment>
                ))}
              </nav>
            </div>
          </header>

          {/* Main Content with smooth scroll */}
          <main className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-muted/20">
            <div className="p-4 md:p-6 max-w-[1800px] mx-auto">
              <Routes>
                <Route index element={<AdminDashboard />} />
                <Route path="identity-verification" element={<IdentityVerificationPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="deposits" element={<DepositsPage />} />
                <Route path="withdrawals" element={<WithdrawalsPage />} />
                <Route path="transfers" element={<TransfersPage />} />
                <Route path="cards" element={<CardsPage />} />
                <Route path="games" element={<GameManagement />} />
                <Route path="betting" element={<BettingManagement />} />
                <Route path="merchants" element={<MerchantManagement />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminPanel;