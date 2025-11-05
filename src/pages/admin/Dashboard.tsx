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
  Clock,
  DollarSign,
  Wallet,
  Activity,
  BarChart3,
  FileText,
  UserCheck,
  UserX,
  Percent,
  Calendar,
  Package
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
    pendingWithdrawals: 0,
    approvedDeposits: 0,
    rejectedDeposits: 0,
    approvedWithdrawals: 0,
    rejectedWithdrawals: 0,
    platformRevenue: 0,
    totalBettingDeposits: 0,
    totalGameTopups: 0,
    totalMerchants: 0,
    activeMerchants: 0,
    usedCards: 0,
    unusedCards: 0,
    revenueBreakdown: {
      depositFees: 0,
      withdrawalFees: 0,
      transferFees: 0,
      bettingFees: 0,
      gameFees: 0
    },
    operationsStats: {
      totalTransactions: 0,
      successRate: 0,
      avgProcessingTime: 0
    }
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
        const [
          depositsRes, 
          withdrawalsRes, 
          transfersRes, 
          cardsRes,
          revenueRes,
          bettingRes,
          gameTopupsRes,
          merchantsRes
        ] = await Promise.all([
          supabase.from('deposits').select('amount, status'),
          supabase.from('withdrawals').select('amount, status'), 
          supabase.from('transfers').select('amount, status'),
          supabase.from('gift_cards').select('amount, is_used'),
          supabase.from('platform_ledger').select('fee_amount, transaction_type'),
          supabase.from('betting_transactions').select('amount, status'),
          supabase.from('game_topup_orders').select('amount, status'),
          supabase.from('merchants').select('is_active')
        ]);

        const totalDeposits = depositsRes.data?.filter(d => d.status === 'approved')
          .reduce((sum, d) => sum + Number(d.amount), 0) || 0;
        
        const totalWithdrawals = withdrawalsRes.data?.filter(w => w.status === 'completed')
          .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
        
        const totalTransfers = transfersRes.data?.filter(t => t.status === 'completed')
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        
        const totalCards = cardsRes.data?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
        const usedCards = cardsRes.data?.filter(c => c.is_used).length || 0;
        const unusedCards = cardsRes.data?.filter(c => !c.is_used).length || 0;
        
        const pendingDeposits = depositsRes.data?.filter(d => d.status === 'pending').length || 0;
        const approvedDeposits = depositsRes.data?.filter(d => d.status === 'approved').length || 0;
        const rejectedDeposits = depositsRes.data?.filter(d => d.status === 'rejected').length || 0;
        
        const pendingWithdrawals = withdrawalsRes.data?.filter(w => w.status === 'pending').length || 0;
        const approvedWithdrawals = withdrawalsRes.data?.filter(w => w.status === 'completed').length || 0;
        const rejectedWithdrawals = withdrawalsRes.data?.filter(w => w.status === 'rejected').length || 0;

        const platformRevenue = revenueRes.data?.reduce((sum, r) => sum + Number(r.fee_amount), 0) || 0;
        
        // Calculate revenue breakdown by type
        const depositFees = revenueRes.data?.filter(r => r.transaction_type === 'deposit_fee')
          .reduce((sum, r) => sum + Number(r.fee_amount), 0) || 0;
        const withdrawalFees = revenueRes.data?.filter(r => r.transaction_type === 'withdrawal_fee')
          .reduce((sum, r) => sum + Number(r.fee_amount), 0) || 0;
        const transferFees = revenueRes.data?.filter(r => r.transaction_type === 'transfer_fee')
          .reduce((sum, r) => sum + Number(r.fee_amount), 0) || 0;
        const bettingFees = revenueRes.data?.filter(r => r.transaction_type === 'betting_deposit_fee')
          .reduce((sum, r) => sum + Number(r.fee_amount), 0) || 0;
        const gameFees = revenueRes.data?.filter(r => r.transaction_type === 'game_topup_fee')
          .reduce((sum, r) => sum + Number(r.fee_amount), 0) || 0;
        
        const totalBettingDeposits = bettingRes.data?.filter(b => b.status === 'completed')
          .reduce((sum, b) => sum + Number(b.amount), 0) || 0;
        
        const totalGameTopups = gameTopupsRes.data?.filter(g => g.status === 'completed')
          .reduce((sum, g) => sum + Number(g.amount), 0) || 0;

        const totalMerchants = merchantsRes.data?.length || 0;
        const activeMerchants = merchantsRes.data?.filter(m => m.is_active).length || 0;

        // Calculate operations stats
        const totalTransactions = (depositsRes.data?.length || 0) + 
                                  (withdrawalsRes.data?.length || 0) + 
                                  (transfersRes.data?.length || 0);
        const successfulTransactions = approvedDeposits + approvedWithdrawals + (transfersRes.data?.length || 0);
        const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;

        setFinancialStats({
          totalDeposits,
          totalWithdrawals,
          totalTransfers,
          totalCards,
          pendingDeposits,
          pendingWithdrawals,
          approvedDeposits,
          rejectedDeposits,
          approvedWithdrawals,
          rejectedWithdrawals,
          platformRevenue,
          totalBettingDeposits,
          totalGameTopups,
          totalMerchants,
          activeMerchants,
          usedCards,
          unusedCards,
          revenueBreakdown: {
            depositFees,
            withdrawalFees,
            transferFees,
            bettingFees,
            gameFees
          },
          operationsStats: {
            totalTransactions,
            successRate,
            avgProcessingTime: 0 // يمكن حسابه لاحقاً
          }
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
          {value}
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
          value={`${Math.round(financialStats.totalDeposits)} دج`}
          description="المقبولة"
          icon={ArrowDownToLine}
          color="success"
        />
        
        <StatsCard
          title="إجمالي السحوبات"
          value={`${Math.round(financialStats.totalWithdrawals)} دج`}
          description="المكتملة"
          icon={ArrowUpFromLine}
          color="primary"
        />
        
        <StatsCard
          title="قيمة البطاقات"
          value={`${Math.round(financialStats.totalCards)} دج`}
          description="إجمالي القيمة"
          icon={CreditCard}
          color="success"
        />
        
        <StatsCard
          title="إيرادات المنصة"
          value={`${Math.round(financialStats.platformRevenue)} دج`}
          description="من العمولات"
          icon={TrendingUp}
          color="success"
        />
      </div>

      {/* Additional Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="عمليات الرهان"
          value={`${Math.round(financialStats.totalBettingDeposits)} دج`}
          description="إجمالي المعاملات"
          icon={ArrowDownToLine}
          color="primary"
        />
        
        <StatsCard
          title="شحن الألعاب"
          value={`${Math.round(financialStats.totalGameTopups)} دج`}
          description="إجمالي الشحنات"
          icon={CreditCard}
          color="primary"
        />

        <StatsCard
          title="التجار المسجلين"
          value={financialStats.totalMerchants}
          description="إجمالي التجار"
          icon={Users}
          color="primary"
        />

        <StatsCard
          title="التجار النشطين"
          value={financialStats.activeMerchants}
          description="يعملون حالياً"
          icon={CheckCircle}
          color="success"
        />
      </div>

      {/* Platform Revenue Breakdown */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              أرباح المنصة - التفاصيل المالية
            </CardTitle>
            <CardDescription>
              تفصيل الإيرادات حسب نوع الخدمة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2 p-4 rounded-lg bg-background/50 border">
                <div className="flex items-center gap-2">
                  <ArrowDownToLine className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-medium text-muted-foreground">رسوم الإيداع</p>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round(financialStats.revenueBreakdown.depositFees)} دج
                </p>
                <p className="text-xs text-muted-foreground">
                  {((financialStats.revenueBreakdown.depositFees / financialStats.platformRevenue) * 100 || 0).toFixed(1)}% من الإيرادات
                </p>
              </div>

              <div className="space-y-2 p-4 rounded-lg bg-background/50 border">
                <div className="flex items-center gap-2">
                  <ArrowUpFromLine className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-muted-foreground">رسوم السحب</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(financialStats.revenueBreakdown.withdrawalFees)} دج
                </p>
                <p className="text-xs text-muted-foreground">
                  {((financialStats.revenueBreakdown.withdrawalFees / financialStats.platformRevenue) * 100 || 0).toFixed(1)}% من الإيرادات
                </p>
              </div>

              <div className="space-y-2 p-4 rounded-lg bg-background/50 border">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-purple-600" />
                  <p className="text-sm font-medium text-muted-foreground">رسوم التحويل</p>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(financialStats.revenueBreakdown.transferFees)} دج
                </p>
                <p className="text-xs text-muted-foreground">
                  {((financialStats.revenueBreakdown.transferFees / financialStats.platformRevenue) * 100 || 0).toFixed(1)}% من الإيرادات
                </p>
              </div>

              <div className="space-y-2 p-4 rounded-lg bg-background/50 border">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  <p className="text-sm font-medium text-muted-foreground">رسوم الرهان</p>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  {Math.round(financialStats.revenueBreakdown.bettingFees)} دج
                </p>
                <p className="text-xs text-muted-foreground">
                  {((financialStats.revenueBreakdown.bettingFees / financialStats.platformRevenue) * 100 || 0).toFixed(1)}% من الإيرادات
                </p>
              </div>

              <div className="space-y-2 p-4 rounded-lg bg-background/50 border">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-pink-600" />
                  <p className="text-sm font-medium text-muted-foreground">رسوم الألعاب</p>
                </div>
                <p className="text-2xl font-bold text-pink-600">
                  {Math.round(financialStats.revenueBreakdown.gameFees)} دج
                </p>
                <p className="text-xs text-muted-foreground">
                  {((financialStats.revenueBreakdown.gameFees / financialStats.platformRevenue) * 100 || 0).toFixed(1)}% من الإيرادات
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">إجمالي الإيرادات</p>
                  <p className="text-3xl font-bold text-primary">
                    {Math.round(financialStats.platformRevenue)} دج
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">حجم المعاملات</p>
                  <p className="text-3xl font-bold text-primary">
                    {Math.round(financialStats.totalDeposits + financialStats.totalWithdrawals + financialStats.totalTransfers)} دج
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">متوسط العمولة</p>
                  <p className="text-3xl font-bold text-primary">
                    {((financialStats.platformRevenue / (financialStats.totalDeposits + financialStats.totalWithdrawals + financialStats.totalTransfers)) * 100 || 0).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operations Performance */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              أداء العمليات
            </CardTitle>
            <CardDescription>إحصائيات العمليات المالية</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">إجمالي العمليات</span>
                <span className="text-lg font-bold">{financialStats.operationsStats.totalTransactions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">معدل النجاح</span>
                <span className="text-lg font-bold text-green-600">
                  {financialStats.operationsStats.successRate.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">إيداعات مقبولة</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-green-600">{financialStats.approvedDeposits}</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {((financialStats.approvedDeposits / (financialStats.approvedDeposits + financialStats.rejectedDeposits + financialStats.pendingDeposits)) * 100 || 0).toFixed(0)}%
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">إيداعات معلقة</span>
                </div>
                <span className="font-bold text-yellow-600">{financialStats.pendingDeposits}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">إيداعات مرفوضة</span>
                </div>
                <span className="font-bold text-red-600">{financialStats.rejectedDeposits}</span>
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">سحوبات مكتملة</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-600">{financialStats.approvedWithdrawals}</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {((financialStats.approvedWithdrawals / (financialStats.approvedWithdrawals + financialStats.rejectedWithdrawals + financialStats.pendingWithdrawals)) * 100 || 0).toFixed(0)}%
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">سحوبات معلقة</span>
                </div>
                <span className="font-bold text-yellow-600">{financialStats.pendingWithdrawals}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">سحوبات مرفوضة</span>
                </div>
                <span className="font-bold text-red-600">{financialStats.rejectedWithdrawals}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              بطاقات الهدايا والخدمات الإضافية
            </CardTitle>
            <CardDescription>إحصائيات الخدمات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 p-4 rounded-lg bg-green-50 border border-green-200">
                <p className="text-xs text-muted-foreground">بطاقات مستخدمة</p>
                <p className="text-2xl font-bold text-green-600">{financialStats.usedCards}</p>
              </div>
              <div className="space-y-2 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs text-muted-foreground">بطاقات متاحة</p>
                <p className="text-2xl font-bold text-blue-600">{financialStats.unusedCards}</p>
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-200">
                <div>
                  <p className="text-sm font-medium text-orange-900">معاملات الرهان</p>
                  <p className="text-xs text-orange-700">إجمالي القيمة</p>
                </div>
                <p className="text-xl font-bold text-orange-600">
                  {financialStats.totalBettingDeposits >= 1000000 
                    ? `${(financialStats.totalBettingDeposits / 1000000).toFixed(1)}M`
                    : `${(financialStats.totalBettingDeposits / 1000).toFixed(0)}K`} دج
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
                <div>
                  <p className="text-sm font-medium text-purple-900">شحن الألعاب</p>
                  <p className="text-xs text-purple-700">إجمالي القيمة</p>
                </div>
                <p className="text-xl font-bold text-purple-600">
                  {financialStats.totalGameTopups >= 1000000 
                    ? `${(financialStats.totalGameTopups / 1000000).toFixed(1)}M`
                    : `${(financialStats.totalGameTopups / 1000).toFixed(0)}K`} دج
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                <div>
                  <p className="text-sm font-medium text-indigo-900">التجار</p>
                  <p className="text-xs text-indigo-700">نشط / إجمالي</p>
                </div>
                <p className="text-xl font-bold text-indigo-600">
                  {financialStats.activeMerchants} / {financialStats.totalMerchants}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
                <span className="text-sm text-blue-800">إيرادات العمولات</span>
                <span className="text-sm font-medium text-green-600">
                  {financialStats.platformRevenue >= 1000 
                    ? `${(financialStats.platformRevenue / 1000).toFixed(1)}K دج`
                    : `${financialStats.platformRevenue.toFixed(0)} دج`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-blue-800">الإيداعات المعلقة</span>
                <span className="text-sm font-medium text-yellow-600">
                  {financialStats.pendingDeposits} طلب
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-blue-800">السحوبات المعلقة</span>
                <span className="text-sm font-medium text-yellow-600">
                  {financialStats.pendingWithdrawals} طلب
                </span>
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