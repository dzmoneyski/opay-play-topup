import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useBalance } from "@/hooks/useBalance";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import ServicesSection from "@/components/ServicesSection";
import RecentTransactions from "@/components/RecentTransactions";
import { 
  CreditCard, 
  Send, 
  ShoppingBag, 
  Gift, 
  Plus,
  Smartphone,
  MapPin,
  QrCode,
  ArrowDownToLine,
  ArrowUpRight,
  Shield
} from "lucide-react";

const Index = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { balance, loading: balanceLoading } = useBalance();
  const { toast } = useToast();
  const [showBalance, setShowBalance] = React.useState(true);

  const handleServiceClick = (service: any) => {
    if (service.action === 'disabled') {
      toast({
        title: "خدمة غير متاحة",
        description: "ستكون هذه الخدمة متاحة قريباً",
      });
      return;
    }

    if (service.action === 'deposits') {
      window.location.href = '/deposits';
      return;
    }

    if (service.action === 'transfer') {
      window.location.href = '/transfer';
      return;
    }

    console.log(`Navigating to service: ${service.title}`);
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
      icon: <ShoppingBag className="h-6 w-6" />,
      title: "شراء بطاقات",
      subtitle: "Google Play، Steam، Netflix",
      gradient: "bg-gradient-gold",
      action: "disabled"
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      title: "فعّل بطاقة",
      subtitle: "أدخل كود بطاقة OpaY",
      gradient: "bg-gradient-primary",
      action: "activate"
    }
  ];

  const quickActions = [
    { icon: <QrCode className="h-5 w-5" />, title: "مسح QR", desc: "ادفع بسرعة" },
    { icon: <Smartphone className="h-5 w-5" />, title: "شحن هاتف", desc: "رصيد الجوال" },
    { icon: <Gift className="h-5 w-5" />, title: "الهدايا", desc: "بطاقات هدايا" },
    { icon: <MapPin className="h-5 w-5" />, title: "المتاجر", desc: "أقرب كشك" }
  ];

  const recentTransactions = [
    { 
      id: 1, 
      type: "شراء", 
      desc: "بطاقة Google Play 500 دج", 
      amount: -500, 
      icon: <ShoppingBag className="h-4 w-4" />,
      time: "منذ ساعتين"
    },
    { 
      id: 2, 
      type: "شحن", 
      desc: "بطاقة OpaY من الكشك", 
      amount: +2000, 
      icon: <Plus className="h-4 w-4" />,
      time: "اليوم"
    },
    { 
      id: 3, 
      type: "تحويل", 
      desc: "إلى كريم بن علي", 
      amount: -750, 
      icon: <Send className="h-4 w-4" />,
      time: "أمس"
    }
  ];
  
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header 
        balance={balance}
        balanceLoading={balanceLoading}
        showBalance={showBalance}
        setShowBalance={setShowBalance}
        profile={profile}
        quickActions={quickActions}
      />

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
        <ServicesSection services={services} handleServiceClick={handleServiceClick} />
        <RecentTransactions transactions={recentTransactions} />

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
    </div>
  );
};

export default Index;