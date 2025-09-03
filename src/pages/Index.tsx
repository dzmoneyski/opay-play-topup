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
  Lock,
  QrCode,
  ArrowDownToLine
} from "lucide-react";

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
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-blue-600 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Wallet className="h-6 w-6 text-white" />
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
        {/* Balance and QR Pay Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Balance Card */}
          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-600">الرصيد المتاح</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-gray-500 hover:text-blue-600"
                >
                  {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-blue-600">
                  {showBalance ? `${balance.toFixed(2)}` : "••••••"}
                </span>
                <span className="text-lg text-gray-600 font-medium">دج</span>
              </div>
            </CardContent>
          </Card>

          {/* QR Pay Card */}
          <Card className="bg-blue-600 shadow-lg border-0">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <div className="bg-white/20 p-4 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <QrCode className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">الدفع بـ QR</h3>
                <p className="text-white/80 text-sm">ادفع بسرعة وأمان</p>
              </div>
              
              <Button variant="secondary" className="w-full bg-white/20 border-0 text-white hover:bg-white/30">
                <QrCode className="h-4 w-4 ml-2" />
                مسح الكود
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Withdrawal Card */}
        <Card className="bg-gradient-to-r from-green-500 to-green-600 shadow-lg border-0 relative overflow-hidden animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[slide-in-right_2s_ease-in-out_infinite] opacity-75"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  <ArrowDownToLine className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">سحب الأموال</h3>
                  <p className="text-white/90 text-sm">اسحب رصيدك إلى حسابك البنكي</p>
                </div>
              </div>
              <Button className="bg-white/20 hover:bg-white/30 border-0 text-white font-semibold px-6">
                سحب الآن
              </Button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex justify-between items-center text-white/90 text-sm">
                <span>الحد الأدنى للسحب: 1000 دج</span>
                <span>رسوم السحب: 50 دج</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Grid */}
        <div className="grid grid-cols-2 gap-4">
          {services.map((service, index) => (
            <Card 
              key={index} 
              className={`
                shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-white cursor-pointer group
                ${service.variant === 'disabled' ? 'cursor-not-allowed relative' : ''}
              `}
            >
              <CardContent className="p-4 text-center">
                <div className={`
                  inline-flex p-3 rounded-xl mb-3 transition-all duration-300 
                  ${service.variant !== 'disabled' ? 'group-hover:scale-110' : ''}
                  ${service.variant === 'primary' ? 'bg-blue-600 text-white' :
                    service.variant === 'secondary' ? 'bg-gray-100 text-gray-700' :
                    service.variant === 'success' ? 'bg-green-600 text-white' :
                    service.variant === 'disabled' ? 'bg-yellow-500 text-white relative' :
                    'bg-gray-100 text-gray-700'}
                `}>
                  {service.icon}
                  {service.variant === 'disabled' && (
                    <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-md">
                      <Lock className="h-3 w-3 text-gray-500" />
                    </div>
                  )}
                </div>
                <h3 className={`font-semibold mb-1 ${service.variant === 'disabled' ? 'text-gray-700' : ''}`}>
                  {service.title}
                </h3>
                <p className="text-xs text-gray-500">{service.subtitle}</p>
                {service.variant === 'disabled' && (
                  <div className="absolute inset-0 bg-black/5 rounded-lg flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full border">
                      <span className="text-xs font-medium text-gray-500">قريباً</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Transactions */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              المعاملات الأخيرة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${transaction.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {transaction.icon}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{transaction.desc}</p>
                    <p className="text-xs text-gray-500">{transaction.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {transaction.amount > 0 ? (
                    <ArrowDownLeft className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-blue-600" />
                  )}
                  <span className={`font-semibold ${transaction.amount > 0 ? 'text-green-600' : 'text-blue-600'}`}>
                    {transaction.amount > 0 ? '+' : ''}{Math.abs(transaction.amount)} دج
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-lg border-0 bg-yellow-500">
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