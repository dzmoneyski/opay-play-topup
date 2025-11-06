import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Shield,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  Send,
  Gift,
  Settings,
  Gamepad2,
  Bell,
  Menu,
  X,
  Home,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { cn } from '@/lib/utils';

const mainItems = [
  { title: "لوحة التحكم", url: "/admin", icon: LayoutDashboard, exact: true },
  { title: "طلبات التحقق", url: "/admin/identity-verification", icon: Shield, notificationKey: 'pendingVerifications' },
  { title: "المستخدمين", url: "/admin/users", icon: Users },
  { title: "إدارة التجار", url: "/admin/merchants", icon: Users },
];

const transactionItems = [
  { title: "عمليات الإيداع", url: "/admin/deposits", icon: ArrowDownToLine, notificationKey: 'pendingDeposits' },
  { title: "عمليات السحب", url: "/admin/withdrawals", icon: ArrowUpFromLine, notificationKey: 'pendingWithdrawals' },
  { title: "التحويلات", url: "/admin/transfers", icon: Send },
];

const serviceItems = [
  { title: "البطاقات الرقمية", url: "/admin/cards", icon: Gift },
  { title: "إدارة الألعاب", url: "/admin/games", icon: Gamepad2, notificationKey: 'pendingGames' },
  { title: "إدارة المراهنات", url: "/admin/betting", icon: Gamepad2, notificationKey: 'pendingBetting' },
];

export function AdminNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { counts } = useAdminNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const getNotificationCount = (key?: string) => {
    if (!key) return 0;
    return counts[key as keyof typeof counts] || 0;
  };

  const allItems = [...mainItems, ...transactionItems, ...serviceItems];

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div className="hidden md:block">
              <h1 className="text-lg font-bold text-foreground">لوحة الإدارة</h1>
              <p className="text-xs text-muted-foreground">OpaY الجزائر</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {mainItems.map((item) => {
              const active = isActive(item.url, item.exact);
              const notifCount = getNotificationCount(item.notificationKey);
              
              return (
                <Link
                  key={item.url}
                  to={item.url}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative",
                    active 
                      ? "bg-gradient-primary text-white shadow-sm" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <div className="relative">
                    <item.icon className="h-4 w-4" />
                    {notifCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] font-bold rounded-full"
                      >
                        {notifCount}
                      </Badge>
                    )}
                  </div>
                  <span>{item.title}</span>
                </Link>
              );
            })}

            {/* Transactions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 relative">
                  <div className="relative">
                    <ArrowDownToLine className="h-4 w-4" />
                    {(counts.pendingDeposits + counts.pendingWithdrawals) > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] font-bold rounded-full"
                      >
                        {counts.pendingDeposits + counts.pendingWithdrawals}
                      </Badge>
                    )}
                  </div>
                  <span>العمليات المالية</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>العمليات المالية</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {transactionItems.map((item) => {
                  const notifCount = getNotificationCount(item.notificationKey);
                  return (
                    <DropdownMenuItem key={item.url} asChild>
                      <Link to={item.url} className="flex items-center gap-2 cursor-pointer">
                        <div className="relative">
                          <item.icon className="h-4 w-4" />
                          {notifCount > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 p-0 flex items-center justify-center text-[9px] font-bold rounded-full"
                            >
                              {notifCount}
                            </Badge>
                          )}
                        </div>
                        <span className="flex-1">{item.title}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Services Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 relative">
                  <div className="relative">
                    <Gift className="h-4 w-4" />
                    {(counts.pendingBetting + counts.pendingGames) > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] font-bold rounded-full animate-pulse"
                      >
                        {counts.pendingBetting + counts.pendingGames}
                      </Badge>
                    )}
                  </div>
                  <span>الخدمات</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>الخدمات والتقارير</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {serviceItems.map((item) => {
                  const notifCount = getNotificationCount((item as any).notificationKey);
                  return (
                    <DropdownMenuItem key={item.url} asChild>
                      <Link to={item.url} className="flex items-center gap-2 cursor-pointer">
                        <div className="relative">
                          <item.icon className="h-4 w-4" />
                          {notifCount > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 p-0 flex items-center justify-center text-[9px] font-bold rounded-full animate-pulse"
                            >
                              {notifCount}
                            </Badge>
                          )}
                        </div>
                        <span className="flex-1">{item.title}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications Bell */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {counts.total > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold rounded-full"
                    >
                      {counts.total}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {counts.pendingVerifications > 0 && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/identity-verification" className="flex items-center gap-3 cursor-pointer">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">طلبات تحقق جديدة</p>
                        <p className="text-xs text-muted-foreground">
                          {counts.pendingVerifications} طلب بانتظار المراجعة
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                )}

                {counts.pendingDeposits > 0 && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/deposits" className="flex items-center gap-3 cursor-pointer">
                      <div className="p-2 rounded-full bg-success/10">
                        <ArrowDownToLine className="h-4 w-4 text-success" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">عمليات إيداع جديدة</p>
                        <p className="text-xs text-muted-foreground">
                          {counts.pendingDeposits} عملية بانتظار التأكيد
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                )}

                {counts.pendingWithdrawals > 0 && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/withdrawals" className="flex items-center gap-3 cursor-pointer">
                      <div className="p-2 rounded-full bg-warning/10">
                        <ArrowUpFromLine className="h-4 w-4 text-warning" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">طلبات سحب جديدة</p>
                        <p className="text-xs text-muted-foreground">
                          {counts.pendingWithdrawals} طلب بانتظار المعالجة
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                )}

                {counts.total === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    لا توجد إشعارات جديدة
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/admin/settings')}
            >
              <Settings className="h-5 w-5" />
            </Button>

            {/* Back to Dashboard */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="hidden md:flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              <span>العودة للوحة التحكم</span>
            </Button>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

          {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t">
            <div className="space-y-1">
              {allItems.map((item) => {
                const active = isActive(item.url, (item as any).exact || false);
                const notifCount = getNotificationCount((item as any).notificationKey);
                
                return (
                  <Link
                    key={item.url}
                    to={item.url}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      active 
                        ? "bg-gradient-primary text-white" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <div className="relative">
                      <item.icon className="h-4 w-4" />
                      {notifCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] font-bold rounded-full"
                        >
                          {notifCount}
                        </Badge>
                      )}
                    </div>
                    <span className="flex-1">{item.title}</span>
                  </Link>
                );
              })}
              
              <div className="pt-2 border-t mt-2">
                <Link
                  to="/admin/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <Settings className="h-4 w-4" />
                  <span>الإعدادات</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
