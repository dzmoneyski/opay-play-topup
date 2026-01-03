import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, CreditCard, Loader2, Shield, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAgentPermissions } from '@/hooks/useAgentPermissions';
import BackButton from '@/components/BackButton';

const AgentDashboard = () => {
  const navigate = useNavigate();
  const { isAgent, permissions, loading, canManageGameTopups, canManageBetting, canManagePhoneTopups } = useAgentPermissions();

  useEffect(() => {
    if (!loading && !isAgent) {
      navigate('/');
    }
  }, [loading, isAgent, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAgent) {
    return null;
  }

  const menuItems = [
    {
      title: 'طلبات شحن الألعاب',
      titleEn: 'Game Top-up Orders',
      description: 'إدارة طلبات شحن الألعاب',
      icon: Gamepad2,
      path: '/agent/game-orders',
      enabled: canManageGameTopups,
      color: 'bg-purple-500',
    },
    {
      title: 'طلبات المراهنات',
      titleEn: 'Betting Orders',
      description: 'إدارة طلبات شحن المراهنات',
      icon: CreditCard,
      path: '/agent/betting-orders',
      enabled: canManageBetting,
      color: 'bg-orange-500',
    },
    {
      title: 'طلبات شحن الهاتف',
      titleEn: 'Phone Top-up Orders',
      description: 'إدارة طلبات شحن الهاتف',
      icon: Smartphone,
      path: '/agent/phone-orders',
      enabled: canManagePhoneTopups,
      color: 'bg-blue-500',
    },
  ];

  const enabledItems = menuItems.filter(item => item.enabled);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <BackButton />
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">لوحة الوكيل</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">مرحباً بك في لوحة الوكيل</h1>
          <p className="text-muted-foreground">يمكنك إدارة الطلبات المخصصة لك</p>
        </div>

        {/* Permissions Card */}
        <Card className="mb-6 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              صلاحياتك
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant={canManageGameTopups ? "default" : "secondary"}>
                {canManageGameTopups ? '✓' : '✗'} شحن الألعاب
              </Badge>
              <Badge variant={canManageBetting ? "default" : "secondary"}>
                {canManageBetting ? '✓' : '✗'} المراهنات
              </Badge>
              <Badge variant={canManagePhoneTopups ? "default" : "secondary"}>
                {canManagePhoneTopups ? '✓' : '✗'} شحن الهاتف
              </Badge>
            </div>
            {permissions?.daily_limit && (
              <p className="text-sm text-muted-foreground mt-3">
                الحد اليومي: {permissions.daily_limit.toLocaleString()} د.ج
              </p>
            )}
          </CardContent>
        </Card>

        {/* Menu Grid */}
        {enabledItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enabledItems.map((item) => (
              <Card 
                key={item.path}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => navigate(item.path)}
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-3`}>
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">لا توجد صلاحيات</h3>
              <p className="text-muted-foreground">
                تواصل مع المسؤول لتفعيل صلاحياتك
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AgentDashboard;
