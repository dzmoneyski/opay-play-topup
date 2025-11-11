import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMerchant } from '@/hooks/useMerchant';
import { useAuth } from '@/hooks/useAuth';
import { useBalance } from '@/hooks/useBalance';
import { Wallet, TrendingUp, Users, ArrowUpRight, Phone, Receipt, Award, RefreshCw, ArrowRightLeft } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const MerchantDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { merchant, transactions, loading, rechargeCustomer, transferFromUserBalance, refreshData } = useMerchant();
  const { balance, fetchBalance } = useBalance();
  
  const [rechargeForm, setRechargeForm] = useState({
    phone: '',
    amount: ''
  });
  const [transferAmount, setTransferAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

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
    if (isNaN(amount) || amount <= 0) return;

    setSubmitting(true);
    const result = await rechargeCustomer(rechargeForm.phone, amount);
    setSubmitting(false);

    if (result.success) {
      setRechargeForm({ phone: '', amount: '' });
    }
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) return;

    setSubmitting(true);
    const result = await transferFromUserBalance(amount);
    setSubmitting(false);

    if (result.success) {
      setTransferAmount('');
      setTransferDialogOpen(false);
      await fetchBalance();
    }
  };

  const tierColors = {
    bronze: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    silver: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    gold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    platinum: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
  };

  const transactionTypeLabels: Record<string, string> = {
    recharge: 'شحن رصيد',
    gift_card_purchase: 'شراء بطاقات',
    commission_earned: 'عمولة',
    balance_topup: 'تعمير رصيد',
    balance_transfer: 'تحويل من الرصيد الشخصي',
    withdrawal: 'سحب'
  };

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
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="h-8 w-8 text-primary" />
                <Button variant="ghost" size="icon" onClick={refreshData}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-1">رصيد التاجر</p>
              <p className="text-2xl font-bold">{merchant.balance.toFixed(2)} دج</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20">
            <CardContent className="pt-6">
              <Wallet className="h-8 w-8 text-blue-600 mb-2" />
              <p className="text-sm text-muted-foreground mb-1">رصيدك الشخصي</p>
              <p className="text-2xl font-bold text-blue-600">
                {balance?.balance.toFixed(2) || '0.00'} دج
              </p>
              <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    <ArrowRightLeft className="ml-2 h-4 w-4" />
                    تحويل إلى رصيد التاجر
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>تحويل رصيد</DialogTitle>
                    <DialogDescription>
                      حول رصيد من حسابك الشخصي إلى حساب التاجر
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>المبلغ المتاح: {balance?.balance.toFixed(2) || '0.00'} دج</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="1"
                        max={balance?.balance || 0}
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        placeholder="أدخل المبلغ للتحويل"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleTransfer} disabled={submitting || !transferAmount}>
                      {submitting ? 'جاري التحويل...' : 'تحويل'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
              <p className="text-sm text-muted-foreground mb-1">إجمالي الأرباح</p>
              <p className="text-2xl font-bold text-green-600">
                {merchant.total_earnings.toFixed(2)} دج
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Users className="h-8 w-8 text-blue-600 mb-2" />
              <p className="text-sm text-muted-foreground mb-1">نسبة العمولة</p>
              <p className="text-2xl font-bold text-blue-600">
                {merchant.commission_rate}%
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
                      step="0.01"
                      min="1"
                      value={rechargeForm.amount}
                      onChange={(e) => setRechargeForm({ ...rechargeForm, amount: e.target.value })}
                      placeholder="100.00"
                      required
                    />
                    {rechargeForm.amount && (
                      <p className="text-sm text-muted-foreground mt-2">
                        العمولة: {(parseFloat(rechargeForm.amount) * merchant.commission_rate / 100).toFixed(2)} دج
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting || !merchant.is_active}>
                    {submitting ? 'جاري الشحن...' : 'شحن الآن'}
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                  </Button>
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
