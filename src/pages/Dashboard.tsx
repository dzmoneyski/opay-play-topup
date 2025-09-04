import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useBalance } from "@/hooks/useBalance";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { 
  CreditCard, 
  Send, 
  ArrowDownToLine,
  ArrowUpRight,
  Eye,
  EyeOff,
  Plus,
  TrendingUp,
  Clock,
  Shield
} from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { balance, loading: balanceLoading } = useBalance();
  const { toast } = useToast();
  const [showBalance, setShowBalance] = React.useState(true);

  console.log('Dashboard Debug:', {
    user,
    profile,
    balance,
    balanceLoading,
    balanceValue: balance?.balance
  });

  const handleServiceClick = (action: string) => {
    if (action === 'disabled') {
      toast({
        title: "خدمة غير متاحة",
        description: "ستكون هذه الخدمة متاحة قريباً",
      });
      return;
    }
  };

  const quickStats = [
    {
      title: "الرصيد الحالي",
      value: showBalance ? (balanceLoading ? "..." : `${balance?.balance?.toLocaleString() || 0} دج`) : "****",
      icon: <CreditCard className="h-6 w-6" />,
      gradient: "bg-gradient-primary"
    },
    {
      title: "المعاملات اليوم",
      value: "3",
      icon: <TrendingUp className="h-6 w-6" />,
      gradient: "bg-gradient-secondary"
    },
    {
      title: "آخر تحويل",
      value: "منذ ساعتين",
      icon: <Clock className="h-6 w-6" />,
      gradient: "bg-gradient-gold"
    }
  ];

  const quickActions = [
    {
      title: "إيداع أموال",
      description: "أضف رصيد جديد",
      icon: <ArrowDownToLine className="h-6 w-6" />,
      link: "/deposits",
      gradient: "bg-gradient-primary"
    },
    {
      title: "تحويل أموال",
      description: "أرسل إلى الأصدقاء",
      icon: <Send className="h-6 w-6" />,
      link: "/transfer",
      gradient: "bg-gradient-secondary"
    },
    {
      title: "سحب الأموال",
      description: "اسحب إلى البنك",
      icon: <ArrowUpRight className="h-6 w-6" />,
      onClick: () => handleServiceClick('disabled'),
      gradient: "bg-gradient-gold"
    }
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20"></div>
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                مرحباً، {profile?.full_name || user?.email?.split('@')[0]}
              </h1>
              <p className="text-white/80">إليك نظرة عامة على حسابك</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBalance(!showBalance)}
              className="text-white hover:bg-white/20"
            >
              {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          {/* Account Status */}
          {!profile?.is_account_activated && (
            <Card className="bg-gradient-gold/10 border-white/10 shadow-soft backdrop-blur-sm mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-white" />
                    <div>
                      <p className="text-white/90 text-sm font-medium">
                        قم بتفعيل حسابك للاستفادة من جميع الخدمات
                      </p>
                    </div>
                  </div>
                  <Link to="/activate">
                    <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0">
                      تفعيل الآن
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickStats.map((stat, index) => (
              <Card key={index} className="bg-white/10 border-white/20 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-sm">{stat.title}</p>
                      <p className="text-white text-xl font-bold">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.gradient}`}>
                      {stat.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8 -mt-4 relative z-20">
        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6">الإجراءات السريعة</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
                <CardContent className="p-6">
                  {action.link ? (
                    <Link to={action.link} className="block">
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`p-3 rounded-xl ${action.gradient} group-hover:scale-110 transition-transform`}>
                          {action.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {action.title}
                          </h3>
                          <p className="text-muted-foreground text-sm">{action.description}</p>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div onClick={action.onClick} className="block">
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`p-3 rounded-xl ${action.gradient} group-hover:scale-110 transition-transform`}>
                          {action.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {action.title}
                          </h3>
                          <p className="text-muted-foreground text-sm">{action.description}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">النشاط الأخير</h2>
            <Button variant="outline" size="sm">
              عرض الكل
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="p-2 rounded-full bg-gradient-primary">
                    <Plus className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">شحن بطاقة OpaY</p>
                    <p className="text-sm text-muted-foreground">اليوم، 2:30 م</p>
                  </div>
                  <p className="font-bold text-green-600">+2,000 دج</p>
                </div>
                
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="p-2 rounded-full bg-gradient-secondary">
                    <Send className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">تحويل إلى كريم بن علي</p>
                    <p className="text-sm text-muted-foreground">أمس، 4:15 م</p>
                  </div>
                  <p className="font-bold text-red-600">-750 دج</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;