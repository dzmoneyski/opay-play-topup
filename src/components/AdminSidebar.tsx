import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  Store,
  ChevronDown
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const mainItems = [
  { title: "لوحة التحكم", url: "/admin", icon: LayoutDashboard, exact: true, badge: null },
  { title: "طلبات التحقق", url: "/admin/identity-verification", icon: Shield, badge: "جديد" },
  { title: "المستخدمين", url: "/admin/users", icon: Users, badge: null },
  { title: "التجار", url: "/admin/merchants", icon: Store, badge: null },
];

const transactionItems = [
  { title: "الإيداعات", url: "/admin/deposits", icon: ArrowDownToLine, badge: "5" },
  { title: "السحوبات", url: "/admin/withdrawals", icon: ArrowUpFromLine, badge: "3" },
  { title: "التحويلات", url: "/admin/transfers", icon: Send, badge: null },
];

const serviceItems = [
  { title: "البطاقات", url: "/admin/cards", icon: Gift, badge: null },
  { title: "الألعاب", url: "/admin/games", icon: Gamepad2, badge: null },
  { title: "المراهنات", url: "/admin/betting", icon: Gamepad2, badge: null },
];

const systemItems = [
  { title: "الإعدادات", url: "/admin/settings", icon: Settings, badge: null },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const [openSections, setOpenSections] = React.useState<string[]>(['main', 'transactions', 'services']);

  const isActive = (path: string, exact = false) => {
    if (exact) return currentPath === path;
    return currentPath.startsWith(path);
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const getNavCls = (isActiveRoute: boolean) =>
    `flex items-center w-full transition-all duration-200 rounded-lg ${
      isActiveRoute 
        ? "bg-gradient-primary text-white shadow-md scale-[1.02]" 
        : "text-muted-foreground hover:text-foreground hover:bg-muted/70 hover:scale-[1.01]"
    }`;

  const SidebarSection = ({ 
    items, 
    label,
    sectionKey
  }: { 
    items: typeof mainItems; 
    label: string;
    sectionKey: string;
  }) => {
    const isOpen = openSections.includes(sectionKey);
    
    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleSection(sectionKey)}>
        <SidebarGroup>
          <CollapsibleTrigger className="w-full">
            <SidebarGroupLabel className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-3 py-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors">
              {state !== 'collapsed' && (
                <>
                  <span>{label}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </>
              )}
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1 mt-2">
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="p-0">
                      <NavLink
                        to={item.url}
                        end={item.exact}
                        className={getNavCls(isActive(item.url, item.exact))}
                      >
                        <div className="flex items-center justify-between px-3 py-2.5 w-full">
                          <div className="flex items-center gap-3">
                            <item.icon className={`h-4 w-4 ${state === 'collapsed' ? 'mx-auto' : ''}`} />
                            {state !== 'collapsed' && (
                              <span className="text-sm font-medium">{item.title}</span>
                            )}
                          </div>
                          {state !== 'collapsed' && item.badge && (
                            <Badge 
                              variant={item.badge === 'جديد' ? 'default' : 'secondary'}
                              className="h-5 px-1.5 text-[10px] font-semibold"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  };

  return (
    <Sidebar
      className={`border-l border-border/50 ${state === 'collapsed' ? "w-16" : "w-72"} transition-all duration-300 shadow-lg`}
      collapsible="icon"
    >
      {/* Enhanced Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-br from-card to-card/80">
        <div className="flex items-center justify-between">
          {state !== 'collapsed' && (
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-primary shadow-md">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">لوحة الإدارة</h2>
                <p className="text-xs text-muted-foreground">OpaY الجزائر</p>
              </div>
            </div>
          )}
          <SidebarTrigger className="h-8 w-8 p-0 hover:bg-muted/70 rounded-lg transition-colors" />
        </div>
      </div>

      <SidebarContent className="px-3 py-4 space-y-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        <SidebarSection items={mainItems} label="القسم الرئيسي" sectionKey="main" />
        <SidebarSection items={transactionItems} label="العمليات المالية" sectionKey="transactions" />
        <SidebarSection items={serviceItems} label="الخدمات" sectionKey="services" />
        <SidebarSection items={systemItems} label="النظام" sectionKey="system" />
      </SidebarContent>

      {/* Footer with quick stats */}
      {state !== 'collapsed' && (
        <div className="p-4 border-t border-border/50 bg-muted/30">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-background/50 text-center">
              <div className="font-bold text-green-600">8</div>
              <div className="text-muted-foreground">قيد الانتظار</div>
            </div>
            <div className="p-2 rounded-lg bg-background/50 text-center">
              <div className="font-bold text-blue-600">156</div>
              <div className="text-muted-foreground">مكتمل اليوم</div>
            </div>
          </div>
        </div>
      )}
    </Sidebar>
  );
}