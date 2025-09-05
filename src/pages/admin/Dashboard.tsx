import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVerificationRequests } from '@/hooks/useVerificationRequests';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  CreditCard, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Shield,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

export default function AdminDashboard() {
  const { requests, loading } = useVerificationRequests();
  const [totalUsers, setTotalUsers] = React.useState(0);
  const [userProfilesData, setUserProfilesData] = React.useState<any[]>([]);
  const [financialStats, setFinancialStats] = React.useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalTransfers: 0,
    totalCards: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0
  });
  
  const pendingRequests = requests.filter(req => req.status === 'pending').length;
  const approvedRequests = requests.filter(req => req.status === 'approved').length;
  const rejectedRequests = requests.filter(req => req.status === 'rejected').length;

  // Fetch all data
  React.useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch user profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*');
        
        if (!profilesError && profiles) {
          setTotalUsers(profiles.length);
          setUserProfilesData(profiles);
        }

        // Fetch financial data
        const [depositsRes, withdrawalsRes, transfersRes, cardsRes] = await Promise.all([
          supabase.from('deposits').select('amount, status'),
          supabase.from('withdrawals').select('amount, status'), 
          supabase.from('transfers').select('amount, status'),
          supabase.from('gift_cards').select('amount, is_used')
        ]);

        const totalDeposits = depositsRes.data?.filter(d => d.status === 'approved')
          .reduce((sum, d) => sum + Number(d.amount), 0) || 0;
        
        const totalWithdrawals = withdrawalsRes.data?.filter(w => w.status === 'completed')
          .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
        
        const totalTransfers = transfersRes.data?.filter(t => t.status === 'completed')
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        
        const totalCards = cardsRes.data?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
        
        const pendingDeposits = depositsRes.data?.filter(d => d.status === 'pending').length || 0;
        const pendingWithdrawals = withdrawalsRes.data?.filter(w => w.status === 'pending').length || 0;

        setFinancialStats({
          totalDeposits,
          totalWithdrawals,
          totalTransfers,
          totalCards,
          pendingDeposits,
          pendingWithdrawals
        });

      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (!loading) {
      fetchAllData();
    }
  }, [loading]);

  const activeUsers = userProfilesData.filter(profile => profile.is_account_activated).length;
  const phoneVerifiedUsers = userProfilesData.filter(profile => profile.is_phone_verified).length;

  const StatsCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend, 
    color = "primary" 
  }: {
    title: string;
    value: string | number;
    description: string;
    icon: React.ComponentType<any>;
    trend?: string;
    color?: string;
  }) => (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-${color}/10 rounded-bl-full`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 text-${color === 'primary' ? 'primary' : color === 'success' ? 'green-600' : color === 'warning' ? 'yellow-600' : 'red-600'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">
          {typeof value === 'number' && value > 1000 
            ? `${(value / 1000).toFixed(1)}K`
            : value
          }
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend && (
            <Badge variant="secondary" className="text-xs">
              {trend}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground mt-2">
          نظرة عامة على نشاط المنصة والإحصائيات الرئيسية
        </p>
      </div>

      {/* Main Statistics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="إجمالي المستخدمين"
          value={totalUsers}
          description="مستخدمين مسجلين"
          icon={Users}
          trend="+12%"
          color="primary"
        />
        
        <StatsCard
          title="المستخدمين النشطين"
          value={activeUsers}
          description="حسابات مفعلة"
          icon={TrendingUp}
          trend="+8%"
          color="success"
        />
        
        <StatsCard
          title="طلبات التحقق المعلقة"
          value={pendingRequests}
          description="تحتاج مراجعة"
          icon={Clock}
          color="warning"
        />
        
        <StatsCard
          title="الهواتف المؤكدة"
          value={phoneVerifiedUsers}
          description="تم تأكيد هواتفهم"
          icon={CheckCircle}
          color="success"
        />
      </div>

      {/* Financial Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="إجمالي الإيداعات"
          value={financialStats.totalDeposits >= 1000000 
            ? `${(financialStats.totalDeposits / 1000000).toFixed(1)}M دج`
            : `${(financialStats.totalDeposits / 1000).toFixed(0)}K دج`}
          description="المقبولة"
          icon={ArrowDownToLine}
          color="success"
        />
        
        <StatsCard
          title="إجمالي السحوبات"
          value={financialStats.totalWithdrawals >= 1000000 
            ? `${(financialStats.totalWithdrawals / 1000000).toFixed(1)}M دج`
            : `${(financialStats.totalWithdrawals / 1000).toFixed(0)}K دج`}
          description="المكتملة"
          icon={ArrowUpFromLine}
          color="primary"
        />
        
        <StatsCard
          title="قيمة البطاقات"
          value={financialStats.totalCards >= 1000000 
            ? `${(financialStats.totalCards / 1000000).toFixed(1)}M دج`
            : `${(financialStats.totalCards / 1000).toFixed(0)}K دج`}
          description="إجمالي القيمة"
          icon={CreditCard}
          color="success"
        />
        
        <StatsCard
          title="الحسابات المفعلة"
          value={approvedRequests}
          description="تم تفعيلها"
          icon={CheckCircle}
          color="success"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Shield className="h-5 w-5" />
              طلبات التحقق
            </CardTitle>
            <CardDescription className="text-yellow-700">
              {pendingRequests} طلب يحتاج مراجعة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-sm text-yellow-800">
                  معلق: {pendingRequests}
                </p>
                <p className="text-sm text-green-700">
                  موافق عليه: {approvedRequests}
                </p>
                <p className="text-sm text-red-700">
                  مرفوض: {rejectedRequests}
                </p>
              </div>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {pendingRequests > 0 ? 'يحتاج انتباه' : 'مُحدث'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <TrendingUp className="h-5 w-5" />
              الأداء المالي
            </CardTitle>
            <CardDescription className="text-blue-700">
              نظرة على الأداء المالي
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-blue-800">الإيرادات</span>
                <span className="text-sm font-medium text-green-600">+18%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-blue-800">العمولات</span>
                <span className="text-sm font-medium text-green-600">+12%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-blue-800">المصروفات</span>
                <span className="text-sm font-medium text-red-600">+5%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              حالة النظام
            </CardTitle>
            <CardDescription className="text-green-700">
              جميع الخدمات تعمل بشكل طبيعي
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-800">قاعدة البيانات</span>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  متصلة
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-800">خدمة الدفع</span>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  نشطة
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-800">التخزين</span>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  متاح
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}