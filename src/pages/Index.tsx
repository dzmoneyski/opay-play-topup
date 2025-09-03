import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Lock
} from "lucide-react";
import opayLogo from "@/assets/opay-logo.jpg";

const Index = () => {
  const [showBalance, setShowBalance] = useState(true);
  const balance = 12580.50;

  const services = [
    {
      icon: <Plus className="h-6 w-6" />,
      title: "شحن رصيد",
      subtitle: "أضف أموال لمحفظتك",
      variant: "primary" as const
    },
    {
      icon: <Send className="h-6 w-6" />,
      title: "تحويل أموال",
      subtitle: "أرسل إلى الأصدقاء والعائلة",
      variant: "secondary" as const
    },
    {
      icon: <ShoppingBag className="h-6 w-6" />,
      title: "شراء بطاقات",
      subtitle: "Google Play، Steam، Netflix",
      variant: "disabled" as const
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      title: "فعّل بطاقة",
      subtitle: "أدخل كود بطاقة OpaY",
      variant: "success" as const
    }
  ];

  const recentTransactions = [
    { id: 1, type: "شراء", desc: "بطاقة Google Play 500 دج", amount: -500, icon: <ShoppingBag className="h-4 w-4" /> },
    { id: 2, type: "شحن", desc: "بطاقة OpaY من الكشك", amount: +2000, icon: <Plus className="h-4 w-4" /> },
    { id: 3, type: "تحويل", desc: "إلى كريم بن علي", amount: -750, icon: <Send className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-accent/5" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-primary shadow-elevated">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg overflow-hidden">
                <img src={opayLogo} alt="OpaY Logo" className="h-6 w-6 rounded" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">OpaY</h1>
                <p className="text-white/80 text-sm">محفظتك الرقمية - الجزائر</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                <Smartphone className="h-3 w-3 ml-1" />
                متصل
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Balance Card */}
        <Card className="bg-gradient-card shadow-glow border-0 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-muted-foreground">الرصيد المتاح</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowBalance(!showBalance)}
                className="text-muted-foreground hover:text-primary"
              >
                {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="flex items-center gap-2 mb-6">
              <span className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {showBalance ? `${balance.toFixed(2)}` : "••••••"}
              </span>
              <span className="text-lg text-muted-foreground font-medium">دج</span>
            </div>

            <div className="flex gap-3">
              <Button className="flex-1 bg-gradient-primary hover:shadow-glow transition-all duration-300">
                <Plus className="h-4 w-4 ml-2" />
                شحن رصيد
              </Button>
              <Button variant="outline" className="flex-1 border-primary/20 hover:bg-primary/5">
                <TrendingUp className="h-4 w-4 ml-2" />
                الإحصائيات
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Services Grid */}
        <div className="grid grid-cols-2 gap-4">
          {services.map((service, index) => (
            <Card 
              key={index} 
              className={`
                shadow-card hover:shadow-elevated transition-all duration-300 border-0 bg-gradient-card cursor-pointer group
                ${service.variant === 'disabled' ? 'cursor-not-allowed relative' : ''}
              `}
            >
              <CardContent className="p-4 text-center">
                <div className={`
                  inline-flex p-3 rounded-xl mb-3 transition-all duration-300 
                  ${service.variant !== 'disabled' ? 'group-hover:scale-110' : ''}
                  ${service.variant === 'primary' ? 'bg-gradient-primary text-white' :
                    service.variant === 'secondary' ? 'bg-secondary text-secondary-foreground' :
                    service.variant === 'success' ? 'bg-success text-white' :
                    service.variant === 'disabled' ? 'bg-gradient-gold text-white relative' :
                    'bg-secondary text-secondary-foreground'}
                `}>
                  {service.icon}
                  {service.variant === 'disabled' && (
                    <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-md">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <h3 className={`font-semibold mb-1 ${service.variant === 'disabled' ? 'text-foreground' : ''}`}>
                  {service.title}
                </h3>
                <p className="text-xs text-muted-foreground">{service.subtitle}</p>
                {service.variant === 'disabled' && (
                  <div className="absolute inset-0 bg-black/5 rounded-lg flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full border">
                      <span className="text-xs font-medium text-muted-foreground">قريباً</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Transactions */}
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              المعاملات الأخيرة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${transaction.amount > 0 ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'}`}>
                    {transaction.icon}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{transaction.desc}</p>
                    <p className="text-xs text-muted-foreground">{transaction.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {transaction.amount > 0 ? (
                    <ArrowDownLeft className="h-4 w-4 text-success" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-primary" />
                  )}
                  <span className={`font-semibold ${transaction.amount > 0 ? 'text-success' : 'text-primary'}`}>
                    {transaction.amount > 0 ? '+' : ''}{Math.abs(transaction.amount)} دج
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-card border-0 bg-gradient-gold">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white mb-1">بطاقات OpaY الجزائر</h3>
                <p className="text-white/90 text-sm">اشترِ بطاقات الشحن من أقرب كشك أو محل</p>
              </div>
              <Gift className="h-8 w-8 text-white" />
            </div>
            <Button variant="secondary" className="w-full mt-4 bg-white/20 border-0 text-white hover:bg-white/30">
              <MapPin className="h-4 w-4 ml-2" />
              اعثر على أقرب كشك
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;