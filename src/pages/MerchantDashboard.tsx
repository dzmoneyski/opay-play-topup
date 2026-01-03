import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMerchant } from '@/hooks/useMerchant';
import { useAuth } from '@/hooks/useAuth';
import { useBalance } from '@/hooks/useBalance';
import { Wallet, TrendingUp, Users, ArrowUpRight, Phone, Receipt, Award, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const MerchantDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { merchant, transactions, loading, topupCustomer, calculateCommission, refreshData } = useMerchant();
  const { balance, fetchBalance } = useBalance();
  
  const [rechargeForm, setRechargeForm] = useState({
    phone: '',
    amount: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [commissionInfo, setCommissionInfo] = useState<{
    commission_amount: number;
    total_from_customer: number;
  } | null>(null);

  // حساب العمولة عند تغيير المبلغ
  useEffect(() => {
    const amount = parseFloat(rechargeForm.amount);
    if (!isNaN(amount) && amount >= 100 && merchant) {
      const commissionAmount = Math.round(amount * merchant.commission_rate / 100 * 100) / 100;
      setCommissionInfo({
        commission_amount: commissionAmount,
        total_from_customer: amount + commissionAmount
      });
    } else {
      setCommissionInfo(null);
    }
  }, [rechargeForm.amount, merchant?.commission_rate]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>يجب تسجيل الدخول</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              تسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>لست مسجلاً كتاجر</CardTitle>
            <CardDescription>
              يجب التسجيل كتاجر أولاً للوصول إلى هذه الصفحة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/become-partner')} className="w-full">
              التسجيل كتاجر
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rechargeForm.phone || !rechargeForm.amount) return;
    
    const amount = parseFloat(rechargeForm.amount);
    if (isNaN(amount) || amount < 100) return;

    setSubmitting(true);
    const result = await topupCustomer(rechargeForm.phone, amount);
    setSubmitting(false);

    if (result.success) {
      setRechargeForm({ phone: '', amount: '' });
      setCommissionInfo(null);
      await fetchBalance(); // تحديث الرصيد
    }
  };

  const tierColors = {
    bronze: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    silver: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    gold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    platinum: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
  };

  const transactionTypeLabels: Record<string, string> = {
    topup: 'شحن رصيد',
    recharge: 'شحن رصيد',
    gift_card_purchase: 'شراء بطاقات',
    commission_earned: 'عمولة',
    balance_topup: 'تعمير رصيد',
    balance_transfer: 'تحويل رصيد',
    withdrawal: 'سحب'
  };

  const userBalance = balance?.balance || 0;
  const amount = parseFloat(rechargeForm.amount) || 0;
  const hasEnoughBalance = userBalance >= amount;

  return (
    <div className="min-h-screen p-4">
      <BackButton />
      
      <div className="max-w-7xl mx-auto mt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">{merchant.business_name}</h1>
            <Badge className={tierColors[merchant.merchant_tier as keyof typeof tierColors]}>
              <Award className="ml-1 h-3 w-3" />
              {merchant.merchant_tier}
            </Badge>
          </div>
          <p className="text-muted-foreground">كود التاجر: {merchant.merchant_code}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="h-8 w-8 text-primary" />
                <Button variant="ghost" size="icon" onClick={() => { refreshData(); fetchBalance(); }}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-1">رصيدك المتاح للشحن</p>
              <p className="text-2xl font-bold text-primary">{userBalance.toFixed(2)} دج</p>
              <p className="text-xs text-muted-foreground mt-2">
                هذا هو رصيدك الشخصي الذي تستخدمه لشحن الزبائن
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
              <p className="text-sm text-muted-foreground mb-1">إجمالي العمولات المكتسبة</p>
              <p className="text-2xl font-bold text-green-600">
                {merchant.total_earnings.toFixed(2)} دج
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                العمولات التي أخذتها نقداً من الزبائن
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Users className="h-8 w-8 text-blue-600 mb-2" />
              <p className="text-sm text-muted-foreground mb-1">نسبة عمولتك</p>
              <p className="text-2xl font-bold text-blue-600">
                {merchant.commission_rate}%
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                تُضاف للمبلغ ويدفعها الزبون نقداً
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="recharge" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recharge">شحن رصيد</TabsTrigger>
            <TabsTrigger value="history">السجل</TabsTrigger>
          </TabsList>

          <TabsContent value="recharge">
            <Card>
              <CardHeader>
                <CardTitle>شحن رصيد عميل</CardTitle>
                <CardDescription>
                  أدخل رقم هاتف العميل والمبلغ لشحن حسابه
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRecharge} className="space-y-4">
                  <div>
                    <Label htmlFor="phone">رقم هاتف العميل</Label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={rechargeForm.phone}
                        onChange={(e) => setRechargeForm({ ...rechargeForm, phone: e.target.value })}
                        placeholder="05xxxxxxxx"
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="amount">المبلغ (دج)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="1"
                      min="100"
                      max="50000"
                      value={rechargeForm.amount}
                      onChange={(e) => setRechargeForm({ ...rechargeForm, amount: e.target.value })}
                      placeholder="1000"
                      required
                    />
                  </div>

                  {/* Commission Display */}
                  {commissionInfo && amount >= 100 && (
                    <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <AlertTitle className="text-green-800 dark:text-green-400">
                        خذ من الزبون: {commissionInfo.total_from_customer.toFixed(2)} دج
                      </AlertTitle>
                      <AlertDescription className="text-green-700 dark:text-green-300 space-y-1">
                        <p>• المبلغ المُشحن: {amount.toFixed(2)} دج</p>
                        <p>• عمولتك ({merchant.commission_rate}%): {commissionInfo.commission_amount.toFixed(2)} دج</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Balance Warning */}
                  {amount > 0 && !hasEnoughBalance && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        رصيدك غير كافي. لديك {userBalance.toFixed(2)} دج وتحتاج {amount.toFixed(2)} دج
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={submitting || !merchant.is_active || !hasEnoughBalance || amount < 100}
                    size="lg"
                  >
                    {submitting ? 'جاري الشحن...' : 'شحن الآن'}
                    <ArrowUpRight className="mr-2 h-5 w-5" />
                  </Button>

                  {!merchant.is_active && (
                    <p className="text-sm text-destructive text-center">
                      حسابك غير نشط. تواصل مع الإدارة
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>سجل المعاملات</CardTitle>
                <CardDescription>
                  آخر {transactions.length} معاملة
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد معاملات بعد</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">
                            {transactionTypeLabels[tx.transaction_type] || tx.transaction_type}
                          </p>
                          {tx.customer_phone && (
                            <p className="text-sm text-muted-foreground">
                              {tx.customer_phone}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleString('ar-DZ')}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold">
                            {tx.amount.toFixed(2)} دج
                          </p>
                          {tx.commission_amount !== null && tx.commission_amount > 0 && (
                            <p className="text-sm text-green-600">
                              +{tx.commission_amount.toFixed(2)} دج عمولة
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MerchantDashboard;
