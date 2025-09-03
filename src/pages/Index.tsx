import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
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
  ArrowDownToLine
} from "lucide-react";

const Index = () => {
  const { user, signOut } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const balance = 12580.50;

  const services = [
    {
      icon: <Plus className="h-6 w-6" />,
      title: "شحن رصيد",
      subtitle: "أضف أموال لمحفظتك",
      gradient: "bg-gradient-primary",
      action: "top-up"
    },
    {
      icon: <Send className="h-6 w-6" />,
      title: "تحويل أموال", 
      subtitle: "أرسل إلى الأصدقاء والعائلة",
      gradient: "bg-gradient-secondary",
      action: "transfer"
    },
    {
      icon: <ArrowDownToLine className="h-6 w-6" />,
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
      {/* Professional Header */}
      <header className="relative bg-gradient-hero overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glass"></div>
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="bg-gradient-primary p-3 rounded-2xl shadow-glow animate-glow-pulse">
                  <Wallet className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="animate-slide-up">
                <h1 className="text-3xl font-bold text-white mb-1">OpaY الجزائر</h1>
                <p className="text-white/80">محفظتك الرقمية المتطورة</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <Badge className="bg-gradient-secondary text-white border-0 px-3 py-1">
                    <Smartphone className="h-4 w-4 ml-2" />
                    متصل
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => signOut()}
                    className="text-white/70 hover:text-white hover:bg-white/10 border border-white/20"
                  >
                    تسجيل الخروج
                  </Button>
                </div>
              ) : (
                <Link to="/auth">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-white/10 border border-white/20"
                  >
                    تسجيل الدخول
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Hero Balance Display */}
          <div className="bg-gradient-glass backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/70 text-sm mb-1">الرصيد المتاح</p>
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-bold text-white">
                    {showBalance ? `${balance.toFixed(2)}` : "••••••"}
                  </span>
                  <span className="text-xl text-white/80 font-medium">دج</span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowBalance(!showBalance)}
                className="text-white/70 hover:text-white hover:bg-white/10 border border-white/20"
              >
                {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
            </div>
            
            {/* Quick Actions Row */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              {quickActions.map((action, index) => (
                <Button 
                  key={index}
                  variant="ghost" 
                  className="flex-col h-auto py-3 text-white/80 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
                >
                  {action.icon}
                  <span className="text-xs mt-1">{action.title}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </header>

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
              >
                <div className={`absolute inset-0 ${service.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                <CardContent className="p-6 text-center relative z-10">
                  <div className={`
                    inline-flex p-4 rounded-2xl mb-4 transition-all duration-500 group-hover:scale-110
                    ${service.gradient} text-white shadow-soft
                    ${service.action === 'disabled' ? 'relative' : ''}
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
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
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
              <CardTitle className="flex items-center gap-3 text-foreground">
                <div className="p-2 rounded-xl bg-gradient-primary">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                المعاملات الأخيرة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentTransactions.map((transaction, index) => (
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
                      {transaction.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {transaction.desc}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{transaction.type}</span>
                        <span>•</span>
                        <span>{transaction.time}</span>
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
              ))}
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
    </div>
  );
};

export default Index;