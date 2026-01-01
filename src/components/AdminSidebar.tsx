import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Shield,
  Users,
  CreditCard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Send,
  Gift,
  Settings,
  BarChart3,
  FileText,
  Wallet,
  Gamepad2,
  ShoppingBag,
  AlertTriangle
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { counts } = useAdminNotifications();

  const mainItems = [
    { title: "لوحة التحكم", url: "/admin", icon: LayoutDashboard, exact: true, badge: 0 },
    { title: "طلبات التحقق", url: "/admin/identity-verification", icon: Shield, badge: counts.pendingVerifications },
    { title: "المستخدمين", url: "/admin/users", icon: Users, badge: 0 },
    { title: "إدارة التجار", url: "/admin/merchants", icon: Users, badge: 0 },
  ];

  const transactionItems = [
    { title: "عمليات الإيداع", url: "/admin/deposits", icon: ArrowDownToLine, badge: counts.pendingDeposits },
    { title: "عمليات السحب", url: "/admin/withdrawals", icon: ArrowUpFromLine, badge: counts.pendingWithdrawals },
    { title: "التحويلات", url: "/admin/transfers", icon: Send, badge: 0 },
  ];

  const serviceItems = [
    { title: "البطاقات الرقمية", url: "/admin/cards", icon: Gift, badge: counts.pendingDigitalCards },
    { title: "إدارة الألعاب", url: "/admin/games", icon: Gamepad2, badge: counts.pendingGames },
    { title: "إدارة المراهنات", url: "/admin/betting", icon: Gamepad2, badge: counts.pendingBetting + counts.pendingBettingVerifications },
    { title: "طلبات AliExpress", url: "/admin/aliexpress", icon: ShoppingBag, badge: 0 },
    { title: "محاولات الاحتيال", url: "/admin/fraud-attempts", icon: AlertTriangle, badge: 0 },
    { title: "التقارير", url: "/admin/reports", icon: BarChart3, badge: 0 },
    { title: "سجل العمليات", url: "/admin/logs", icon: FileText, badge: 0 },
  ];

  const systemItems = [
    { title: "إعدادات النظام", url: "/admin/settings", icon: Settings, badge: 0 },
  ];

  const isActive = (path: string, exact = false) => {
    if (exact) {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = (isActiveRoute: boolean) =>
    `flex items-center w-full transition-colors duration-200 ${
      isActiveRoute 
        ? "bg-gradient-primary text-white shadow-sm" 
        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
    }`;

  const SidebarSection = ({ 
    items, 
    label 
  }: { 
    items: typeof mainItems; 
    label: string;
  }) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-3 mb-2">
        {state !== 'collapsed' && label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="space-y-1">
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild className="p-0">
                <NavLink
                  to={item.url}
                  end={item.exact}
                  className={getNavCls(isActive(item.url, item.exact))}
                >
                  <div className="flex items-center justify-between px-2 md:px-3 py-2.5 md:py-2 rounded-lg w-full touch-manipulation active:scale-95 transition-transform">
                    <div className="flex items-center">
                      <item.icon className={`h-5 w-5 md:h-4 md:w-4 ${state === 'collapsed' ? 'mx-auto' : 'ml-2'}`} />
                      {state !== 'collapsed' && <span className="mr-3 text-sm md:text-sm font-medium">{item.title}</span>}
                    </div>
                    {state !== 'collapsed' && item.badge > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="h-5 min-w-5 flex items-center justify-center text-xs px-1.5 animate-pulse"
                      >
                        {item.badge}
                      </Badge>
                    )}
                    {state === 'collapsed' && item.badge > 0 && (
                      <span className="absolute top-0 left-0 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                    )}
                  </div>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar
      className={`border-l border-border/50 ${state === 'collapsed' ? "w-16" : "w-64 md:w-64"} transition-all duration-300`}
      collapsible="icon"
    >
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          {state !== 'collapsed' && (
            <div className="flex items-center gap-2">
              <div className="p-1.5 md:p-2 rounded-lg bg-gradient-primary">
                <Wallet className="h-4 w-4 md:h-5 md:w-5 text-white" />
              </div>
              <div className="hidden md:block">
                <h2 className="text-xs md:text-sm font-bold text-foreground">لوحة الإدارة</h2>
                <p className="text-[10px] md:text-xs text-muted-foreground">OpaY الجزائر</p>
              </div>
            </div>
          )}
          <SidebarTrigger className="h-9 w-9 md:h-8 md:w-8 p-0 touch-manipulation active:scale-95 transition-transform" />
        </div>
      </div>

      <SidebarContent className="px-2 py-3 md:py-4 space-y-4 md:space-y-6 overflow-y-auto">
        <SidebarSection items={mainItems} label="القسم الرئيسي" />
        <SidebarSection items={transactionItems} label="العمليات المالية" />
        <SidebarSection items={serviceItems} label="الخدمات والتقارير" />
        <SidebarSection items={systemItems} label="إعدادات النظام" />
      </SidebarContent>
    </Sidebar>
  );
}