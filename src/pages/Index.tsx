import opayLogo from '@/assets/opay-final-logo.png';
import platformsCollage from '@/assets/platforms-collage-final.png';
import telegramLogo from '@/assets/telegram-logo-full.png';
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useBalance } from "@/hooks/useBalance";
import { useToast } from "@/hooks/use-toast";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { QRScanner } from "@/components/QRScanner";
import { InstallBanner } from "@/components/InstallBanner";
import {
  Wallet, 
  CreditCard, 
  Send, 
  ShoppingBag, 
  Gift, 
  TrendingUp,
  Eye,
  EyeOff,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  MapPin,
  Lock,
  QrCode,
  ArrowDownToLine,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  LogOut,
  Shield,
  Bell,
  ArrowLeft,
  Repeat2,
  Gamepad2,
  Users,
  Settings,
  MessageCircle,
  ExternalLink
} from "lucide-react";

const Index = () => {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { isAdmin } = useUserRoles();
  const { balance, loading: balanceLoading } = useBalance();
  const { transactions, loading: transactionsLoading } = useTransactionHistory(10); // Limit to 10 for dashboard
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = React.useState(true);
  const [showQRScanner, setShowQRScanner] = React.useState(false);

  const handleServiceClick = (service: any) => {
    if (service.action === 'disabled') {
      toast({
        title: "خدمة غير متاحة",
        description: "ستكون هذه الخدمة متاحة قريباً",
      });
      return;
    }

    if (service.action === 'deposits') {
      navigate('/deposits');
      return;
    }

    if (service.action === 'transfer') {
      navigate('/transfer');
      return;
    }

    if (service.action === 'withdraw') {
      navigate('/withdrawals');
      return;
    }

    if (service.action === 'cards') {
      navigate('/cards');
      return;
    }

    if (service.action === 'game-topup') {
      navigate('/game-topup');
      return;
    }

    if (service.action === 'become-partner') {
      navigate('/become-partner');
      return;
    }

    if (service.action === 'rewards') {
      navigate('/rewards');
      return;
    }

    if (service.action === 'buy-cards') {
      navigate('/shop');
      return;
    }

    if (service.action === 'aliexpress') {
      navigate('/aliexpress');
      return;
    }

    // السماح بالدخول إلى صفحة الخدمة بغض النظر عن حالة التفعيل
    // التحقق من التفعيل سيتم عند محاولة تنفيذ العملية الفعلية
    console.log(`Navigating to service: ${service.title}`);
    
    // هنا يمكن إضافة التوجيه إلى صفحة الخدمة المناسبة
    // navigate(`/${service.action}`);
  };

  const services = [
    {
      icon: <ArrowDownToLine className="h-6 w-6" />,
      title: "إيداع أموال",
      subtitle: "أضف أموال عبر Baridimob وCCP",
      gradient: "bg-gradient-primary",
      action: "deposits"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "كن شريكاً",
      subtitle: "انضم لشبكة تجارنا واربح عمولات",
      gradient: "bg-gradient-gold",
      action: "become-partner"
    },
    {
      icon: <Send className="h-6 w-6" />,
      title: "تحويل أموال", 
      subtitle: "أرسل إلى الأصدقاء والعائلة",
      gradient: "bg-gradient-secondary",
      action: "transfer"
    },
    {
      icon: <ArrowUpRight className="h-6 w-6" />,
      title: "سحب الأموال",
      subtitle: "اسحب رصيدك إلى البنك",
      gradient: "bg-gradient-secondary",
      action: "withdraw"
    },
    {
      icon: <Repeat2 className="h-6 w-6" />,
      title: "P2P",
      subtitle: "تداول آمن بين المستخدمين",
      gradient: "bg-gradient-gold",
      action: "disabled"
    },
    {
      icon: <img src={platformsCollage} alt="Gaming Platforms" className="w-full h-full object-cover rounded-2xl" />,
      title: "شحن الألعاب",
      subtitle: "PUBG، Free Fire، وأكثر",
      gradient: "bg-gradient-primary",
      action: "game-topup"
    },
    {
      icon: <Gift className="h-6 w-6" />,
      title: "المكافآت",
      subtitle: "الإحالات والجوائز",
      gradient: "bg-gradient-gold",
      action: "rewards"
    },
    {
      icon: <ShoppingBag className="h-6 w-6" />,
      title: "شراء بطاقات",
      subtitle: "Google Play، Steam، Netflix",
      gradient: "bg-gradient-gold",
      action: "buy-cards"
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      title: "فعّل بطاقة",
      subtitle: "أدخل كود بطاقة OpaY",
      gradient: "bg-gradient-primary",
      action: "cards"
    },
    {
      icon: <ShoppingBag className="h-6 w-6" />,
      title: "تسوق من AliExpress",
      subtitle: "اطلب منتجات من AliExpress بكل سهولة",
      gradient: "bg-gradient-to-br from-[#FF6A00] to-[#E60000]",
      action: "aliexpress"
    }
  ];

  const quickActions = [
    { 
      icon: <QrCode className="h-5 w-5" />, 
      title: "مسح QR", 
      desc: "ادفع بسرعة",
      action: "qr_scan"
    },
    { 
      icon: <Smartphone className="h-5 w-5" />, 
      title: "شحن هاتف", 
      desc: "رصيد الجوال",
      action: "disabled"
    },
    { 
      icon: <Gift className="h-5 w-5" />, 
      title: "المكافآت", 
      desc: "الإحالات والجوائز",
      action: "rewards"
    },
    { 
      icon: <MapPin className="h-5 w-5" />, 
      title: "المتاجر", 
      desc: "أقرب كشك",
      action: "stores"
    }
  ];

  const handleQuickAction = (action: string) => {
    if (action === 'qr_scan') {
      setShowQRScanner(true);
      return;
    }
    
    if (action === 'stores') {
      navigate('/stores');
      return;
    }
    
    if (action === 'rewards') {
      navigate('/rewards');
      return;
    }
    
    if (action === 'disabled') {
      toast({
        title: "خدمة غير متاحة",
        description: "ستكون هذه الخدمة متاحة قريباً",
      });
      return;
    }
  };

  const getTransactionIcon = (iconType: string) => {
    switch (iconType) {
      case 'plus': return <Plus className="h-4 w-4" />;
      case 'send': return <Send className="h-4 w-4" />;
      case 'receive': return <ArrowDownLeft className="h-4 w-4" />;
      case 'withdraw': return <ArrowUpRight className="h-4 w-4" />;
      case 'gift': return <Gift className="h-4 w-4" />;
      default: return <Plus className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'مكتمل';
      case 'pending': return 'معلق';
      case 'rejected': return 'مرفوض';
      case 'completed': return 'مكتمل';
      default: return status;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'منذ أقل من ساعة';
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
    if (diffInHours < 48) return 'أمس';
    const diffInDays = Math.floor(diffInHours / 24);
    return `منذ ${diffInDays} يوم`;
  };
  
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Professional Header */}
      <header className="relative bg-gradient-hero overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glass"></div>
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <img 
                src={opayLogo} 
                alt="OpaY Logo" 
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-110 cursor-pointer" 
              />
              <a 
                href="https://t.me/+TRFfgKdTvkI2ZDhk" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-[#0088cc]/40 rounded-full blur-lg group-hover:blur-xl transition-all duration-300"></div>
                  <div className="relative flex items-center gap-1.5 sm:gap-2.5 bg-gradient-to-br from-[#0088cc] to-[#229ED9] backdrop-blur-md rounded-full px-3 py-2 sm:px-5 sm:py-2.5 border-2 border-white/40 hover:border-white/60 transition-all duration-300 hover:scale-105 shadow-[0_4px_20px_rgba(0,136,204,0.5)]">
                    <Send className="h-4 w-4 sm:h-5 sm:w-5 text-white -rotate-45 drop-shadow-lg flex-shrink-0" />
                    <span className="text-white text-xs sm:text-sm font-bold whitespace-nowrap">اسأل عنا</span>
                    <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white group-hover:text-white/90 transition-colors flex-shrink-0" />
                  </div>
                </div>
              </a>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {/* Settings Icon */}
                <div className="relative group">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/settings')}
                    className="w-10 h-10 p-0 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/20 transition-all"
                  >
                    <Settings className="h-5 w-5 text-white" />
                  </Button>
                  <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    الإعدادات
                  </div>
                </div>

                {/* Admin Panel Access */}
                {isAdmin && (
                  <div className="relative group">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate('/admin')}
                      className="w-10 h-10 p-0 bg-gradient-primary/20 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-gradient-primary/30 transition-all"
                    >
                      <Shield className="h-5 w-5 text-white" />
                    </Button>
                    <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      لوحة الإدارة
                    </div>
                  </div>
                )}
                
                {/* Account Status Icon */}
                {profile?.is_account_activated ? (
                  <div className="relative group">
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-secondary/20 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-gradient-secondary/30 transition-all cursor-pointer">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      الحساب مفعل
                    </div>
                  </div>
                ) : (
                  <Link to="/activate">
                    <div className="relative group">
                      {/* شارة التنبيه الملتصقة */}
                      <div className="absolute -top-1 -right-1 z-50 pointer-events-none animate-pulse">
                        <div className="bg-gradient-to-br from-[#0088cc] to-[#229ED9] text-white px-2 py-0.5 rounded-full shadow-[0_0_15px_rgba(0,136,204,0.8)] font-bold text-[10px] whitespace-nowrap border-2 border-white">
                          أكد حسابك
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center w-10 h-10 bg-gradient-gold/20 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-gradient-gold/30 transition-all">
                        <Bell className="h-5 w-5 text-white" />
                      </div>
                      <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        تفعيل الحساب
                      </div>
                    </div>
                  </Link>
                )}
                
                {/* Logout Icon */}
                <div className="relative group">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => signOut()}
                    className="w-10 h-10 p-0 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/20 transition-all"
                  >
                    <LogOut className="h-5 w-5 text-white" />
                  </Button>
                  <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    تسجيل الخروج
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Telegram Community Banner */}
          <div className="mb-6">
            <a 
              href="https://t.me/+TRFfgKdTvkI2ZDhk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block group"
            >
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#0088cc] to-[#229ED9] shadow-elevated hover:shadow-glow transition-all duration-500 hover:scale-[1.02]">
                <div className="absolute inset-0 bg-gradient-glass"></div>
                <CardContent className="p-4 sm:p-5 relative z-10">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 bg-white/30 rounded-full blur-md animate-pulse-glow"></div>
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                        <img 
                          src={telegramLogo} 
                          alt="Telegram" 
                          className="w-full h-full object-cover drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-sm sm:text-base mb-0.5 flex items-center gap-1.5">
                        انضم لمجتمع OpaY على تلغرام
                        <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </h3>
                      <p className="text-white/90 text-xs leading-relaxed">
                        تحقق من صحة التطبيق • شاهد تجارب المستخدمين • احصل على الدعم الفوري
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="hidden sm:flex bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm group-hover:translate-x-2 transition-transform flex-shrink-0"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </a>
          </div>

          {/* Hero Balance Display */}
          <div className="bg-gradient-glass backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/70 text-sm mb-1">الرصيد المتاح</p>
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-bold text-white">
                    {balanceLoading ? (
                      <div className="h-10 bg-white/20 rounded animate-pulse w-32" />
                    ) : (
                      showBalance ? `${(balance?.balance ?? 0).toFixed(2)}` : "••••••"
                    )}
                  </span>
                  <span className="text-xl text-white/80 font-medium">دج</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowQRScanner(true)}
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white hover:bg-white/10 border border-white/20"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-white/70 hover:text-white hover:bg-white/10 border border-white/20"
                >
                  {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>
            
            {/* Quick Actions Row */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              {quickActions.map((action, index) => (
                <Button 
                  key={index}
                  variant="ghost" 
                  className="flex-col h-auto py-3 text-white/80 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
                  onClick={() => handleQuickAction(action.action)}
                >
                  {action.icon}
                  <span className="text-xs mt-1">{action.title}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </header>

        {/* Simplified Account Status Banner - Only for Non-Activated Users */}
        {!profile?.is_account_activated && (
          <div className="container mx-auto px-4 pt-4 -mt-4 relative z-20">
            <Card className="bg-gradient-gold/10 border-white/10 shadow-soft animate-slide-up backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-white" />
                    <div>
                      <p className="text-white/90 text-sm font-medium">
                        قم بتفعيل حسابك للاستفادة من جميع الخدمات المالية
                      </p>
                      <p className="text-white/70 text-xs">
                        {!profile?.is_phone_verified && "تحقق من رقم الهاتف • "}
                        {!profile?.is_identity_verified && "تحقق من الهوية"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!profile?.is_identity_verified && (
                      <Link to="/identity-verification">
                        <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm text-xs">
                          تحقق الهوية
                        </Button>
                      </Link>
                    )}
                    <Link to="/activate">
                      <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm text-xs">
                        تفعيل
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="container mx-auto px-4 py-8 space-y-8 -mt-4 relative z-20">
        {/* Services Section */}
        <div className="animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-primary rounded-full"></div>
            الخدمات المصرفية
          </h2>

          {/* Main Services Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {services.map((service, index) => (
              <Card 
                key={index} 
                className={`
                  group cursor-pointer border-0 bg-gradient-card shadow-card hover:shadow-elevated 
                  transition-all duration-500 hover:scale-105 relative overflow-hidden
                  ${service.action === 'disabled' ? 'cursor-not-allowed' : ''}
                `}
                onClick={() => handleServiceClick(service)}
              >
                <div className={`absolute inset-0 ${service.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                <CardContent className="p-6 text-center relative z-10">
                  <div className={`
                    inline-flex items-center justify-center rounded-2xl mb-4 transition-all duration-500 group-hover:scale-110
                    ${service.gradient} text-white shadow-soft overflow-hidden
                    ${service.action === 'disabled' ? 'relative' : ''}
                    ${service.action === 'game-topup' ? 'w-20 h-20 p-0' : 'w-20 h-20 p-4'}
                  `}>
                    {service.icon}
                    {service.action === 'disabled' && (
                      <div className="absolute -top-1 -right-1 bg-card rounded-full p-1 shadow-md">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{service.subtitle}</p>
                  {service.action === 'disabled' && (
                    <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px] rounded-lg flex items-center justify-center">
                      <Badge variant="secondary" className="font-medium">قريباً</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="animate-slide-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
          <Card className="shadow-card border-0 bg-gradient-card backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-foreground">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-primary">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  المعاملات الأخيرة
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/transactions')}
                  className="text-primary hover:text-primary hover:bg-primary/10"
                >
                  عرض الكل
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {transactionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted animate-pulse rounded-xl"></div>
                        <div className="space-y-2">
                          <div className="w-32 h-4 bg-muted animate-pulse rounded"></div>
                          <div className="w-24 h-3 bg-muted animate-pulse rounded"></div>
                        </div>
                      </div>
                      <div className="w-20 h-6 bg-muted animate-pulse rounded"></div>
                    </div>
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد معاملات حتى الآن</p>
                </div>
              ) : (
                transactions.map((transaction, index) => (
                  <div 
                    key={transaction.id} 
                    className="group flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-gradient-primary/5 transition-all duration-300 hover:shadow-soft border border-transparent hover:border-primary/10"
                    style={{ animationDelay: `${0.1 * index}s`, animationFillMode: 'both' }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`
                        p-3 rounded-xl transition-all duration-300 group-hover:scale-110
                        ${transaction.amount > 0 
                          ? 'bg-gradient-secondary text-white shadow-soft' 
                          : 'bg-gradient-primary text-white shadow-soft'
                        }
                      `}>
                        {getTransactionIcon(transaction.icon_type)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {transaction.description}
                          {transaction.transaction_number && (
                            <span className="text-xs text-muted-foreground mr-2 font-normal">
                              #{transaction.transaction_number}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{getStatusText(transaction.status)}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(transaction.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`
                        p-1 rounded-lg
                        ${transaction.amount > 0 ? 'bg-success/10' : 'bg-primary/10'}
                      `}>
                        {transaction.amount > 0 ? (
                          <ArrowDownLeft className="h-4 w-4 text-success" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <span className={`
                        font-bold text-lg
                        ${transaction.amount > 0 ? 'text-success' : 'text-primary'}
                      `}>
                        {transaction.amount > 0 ? '+' : ''}{Math.abs(transaction.amount)} دج
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Store Locator Card */}
        <div className="animate-slide-up" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
          <Card className="bg-gradient-gold shadow-glow border-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer bg-[length:200%_100%]"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm animate-float">
                    <Gift className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">بطاقات OpaY الجزائر</h3>
                    <p className="text-white/90">اشترِ بطاقات الشحن من أقرب كشك أو محل</p>
                  </div>
                </div>
              </div>
              <Button className="w-full bg-white/20 hover:bg-white/30 border-0 text-white font-semibold py-3 backdrop-blur-sm">
                <MapPin className="h-5 w-5 ml-2" />
                اعثر على أقرب كشك
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Scanner Modal */}
      <QRScanner 
        open={showQRScanner}
        onOpenChange={setShowQRScanner}
      />

      {/* Install Banner */}
      <InstallBanner />
    </div>
  );
};

export default Index;