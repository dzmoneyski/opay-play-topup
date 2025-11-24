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
  Truck
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

const mainItems = [
  { title: "لوحة التحكم", url: "/admin", icon: LayoutDashboard, exact: true },
  { title: "طلبات التحقق", url: "/admin/identity-verification", icon: Shield },
  { title: "المستخدمين", url: "/admin/users", icon: Users },
  { title: "إدارة التجار", url: "/admin/merchants", icon: Users },
];

const transactionItems = [
  { title: "عمليات الإيداع", url: "/admin/deposits", icon: ArrowDownToLine },
  { title: "عمليات السحب", url: "/admin/withdrawals", icon: ArrowUpFromLine },
  { title: "التحويلات", url: "/admin/transfers", icon: Send },
];

const serviceItems = [
  { title: "البطاقات الرقمية", url: "/admin/cards", icon: Gift },
  { title: "توصيل البطاقات", url: "/admin/card-delivery", icon: Truck },
  { title: "إدارة الألعاب", url: "/admin/games", icon: Gamepad2 },
  { title: "إدارة المراهنات", url: "/admin/betting", icon: Gamepad2 },
  { title: "طلبات AliExpress", url: "/admin/aliexpress", icon: ShoppingBag },
  { title: "التقارير", url: "/admin/reports", icon: BarChart3 },
  { title: "سجل العمليات", url: "/admin/logs", icon: FileText },
];

const systemItems = [
  { title: "إعدادات النظام", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

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
                  <div className="flex items-center px-2 md:px-3 py-2.5 md:py-2 rounded-lg w-full touch-manipulation active:scale-95 transition-transform">
                    <item.icon className={`h-5 w-5 md:h-4 md:w-4 ${state === 'collapsed' ? 'mx-auto' : 'ml-2'}`} />
                    {state !== 'collapsed' && <span className="mr-3 text-sm md:text-sm font-medium">{item.title}</span>}
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