import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMerchant } from '@/hooks/useMerchant';
import { useAuth } from '@/hooks/useAuth';
import { useBalance } from '@/hooks/useBalance';
import { 
  Wallet, TrendingUp, Users, ArrowUpRight, Phone, Receipt, Award, RefreshCw, 
  AlertCircle, CheckCircle2, Store, Sparkles, Copy, Crown, Zap, ArrowDownToLine,
  Clock, BadgeCheck, Loader2
} from 'lucide-react';
import BackButton from '@/components/BackButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

const MerchantDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { merchant, transactions, loading, topupCustomer, refreshData } = useMerchant();
  const { balance, fetchBalance } = useBalance();
  
  const [rechargeForm, setRechargeForm] = useState({
    phone: '',
    amount: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [commissionInfo, setCommissionInfo] = useState<{
    commission_amount: number;
    total_from_customer: number;
  } | null>(null);

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

  const copyMerchantCode = () => {
    if (merchant) {
      navigator.clipboard.writeText(merchant.merchant_code);
      toast({ title: 'تم النسخ', description: 'تم نسخ كود التاجر' });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="max-w-md w-full border-2 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Store className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>يجب تسجيل الدخول</CardTitle>
              <CardDescription>الرجاء تسجيل الدخول للوصول للوحة التحكم</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/auth')} className="w-full" size="lg">
                تسجيل الدخول
                <ArrowUpRight className="mr-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </motion.div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="max-w-md w-full border-2 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle>لست مسجلاً كتاجر</CardTitle>
              <CardDescription>
                يجب التسجيل كتاجر أولاً للوصول إلى هذه الصفحة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/become-partner')} className="w-full" size="lg">
                <Sparkles className="ml-2 h-4 w-4" />
                التسجيل كتاجر
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Validate phone number
  const validatePhone = (phone: string): boolean => {
    const cleanedPhone = phone.replace(/[^0-9]/g, '');
    if (cleanedPhone.length < 10) {
      setPhoneError('رقم الهاتف يجب أن يكون 10 أرقام على الأقل');
      return false;
    }
    if (!/^0[567]\d{8}$/.test(cleanedPhone)) {
      setPhoneError('رقم الهاتف غير صحيح (يجب أن يبدأ بـ 05 أو 06 أو 07)');
      return false;
    }
    setPhoneError('');
    return true;
  };

  // Validate amount
  const validateAmount = (amountStr: string): boolean => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 100) {
      setAmountError('الحد الأدنى للشحن 100 دج');
      return false;
    }
    if (amount > 50000) {
      setAmountError('الحد الأقصى للشحن 50,000 دج');
      return false;
    }
    setAmountError('');
    return true;
  };

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    const isPhoneValid = validatePhone(rechargeForm.phone);
    const isAmountValid = validateAmount(rechargeForm.amount);
    
    if (!isPhoneValid || !isAmountValid) return;
    
    const amount = parseFloat(rechargeForm.amount);

    setSubmitting(true);
    const result = await topupCustomer(rechargeForm.phone.replace(/[^0-9]/g, ''), amount);
    setSubmitting(false);

    if (result.success) {
      setRechargeForm({ phone: '', amount: '' });
      setCommissionInfo(null);
      setPhoneError('');
      setAmountError('');
      await fetchBalance();
    }
  };

  const tierConfig = {
    bronze: { 
      color: 'bg-gradient-to-r from-orange-500 to-orange-600',
      badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      icon: Award,
      label: 'برونزي'
    },
    silver: { 
      color: 'bg-gradient-to-r from-gray-400 to-gray-500',
      badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      icon: Award,
      label: 'فضي'
    },
    gold: { 
      color: 'bg-gradient-to-r from-yellow-500 to-amber-500',
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      icon: Crown,
      label: 'ذهبي'
    },
    platinum: { 
      color: 'bg-gradient-to-r from-purple-500 to-indigo-500',
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      icon: Crown,
      label: 'بلاتيني'
    }
  };

  const tier = tierConfig[merchant.merchant_tier as keyof typeof tierConfig] || tierConfig.bronze;
  const TierIcon = tier.icon;

  const transactionTypeLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    topup: { label: 'شحن رصيد', icon: ArrowUpRight, color: 'text-green-600' },
    recharge: { label: 'شحن رصيد', icon: ArrowUpRight, color: 'text-green-600' },
    gift_card_purchase: { label: 'شراء بطاقات', icon: Receipt, color: 'text-blue-600' },
    commission_earned: { label: 'عمولة', icon: TrendingUp, color: 'text-emerald-600' },
    balance_topup: { label: 'تعمير رصيد', icon: ArrowDownToLine, color: 'text-purple-600' },
    balance_transfer: { label: 'تحويل رصيد', icon: Users, color: 'text-blue-600' },
    withdrawal: { label: 'سحب', icon: Wallet, color: 'text-orange-600' }
  };

  const userBalance = balance?.balance || 0;
  const amount = parseFloat(rechargeForm.amount) || 0;
  const hasEnoughBalance = userBalance >= amount;

  const quickAmounts = [500, 1000, 2000, 5000];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <BackButton />
      
      <div className="max-w-5xl mx-auto p-4 pt-6">
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`${tier.color} text-white mb-6 overflow-hidden relative`}>
            <div className="absolute top-0 left-0 w-full h-full bg-black/10" />
            <CardContent className="pt-6 pb-6 relative">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Store className="h-6 w-6" />
                    <h1 className="text-2xl font-bold">{merchant.business_name}</h1>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                      <TierIcon className="ml-1 h-3 w-3" />
                      {tier.label}
                    </Badge>
                    {merchant.is_active ? (
                      <Badge className="bg-green-500/20 text-white border-green-300/30">
                        <BadgeCheck className="ml-1 h-3 w-3" />
                        نشط
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-white border-red-300/30">
                        غير نشط
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { refreshData(); fetchBalance(); }}
                  className="text-white hover:bg-white/20"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-lg p-3">
                <span className="text-sm opacity-80">كود التاجر:</span>
                <span className="font-mono font-bold text-lg">{merchant.merchant_code}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyMerchantCode}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200/50 dark:border-blue-800/50">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">رصيدك</p>
              <p className="text-lg font-bold text-blue-600">{Math.floor(userBalance)} دج</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-green-200/50 dark:border-green-800/50">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">أرباحك</p>
              <p className="text-lg font-bold text-green-600">{Math.floor(merchant.total_earnings)} دج</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 border-purple-200/50 dark:border-purple-800/50">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">عمولتك</p>
              <p className="text-lg font-bold text-purple-600">{merchant.commission_rate}%</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="recharge" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="recharge" className="text-base gap-2">
                <Zap className="h-4 w-4" />
                شحن رصيد
              </TabsTrigger>
              <TabsTrigger value="history" className="text-base gap-2">
                <Receipt className="h-4 w-4" />
                السجل
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recharge">
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <ArrowUpRight className="h-5 w-5 text-primary" />
                    </div>
                    شحن رصيد عميل
                  </CardTitle>
                  <CardDescription>
                    أدخل رقم هاتف العميل والمبلغ لشحن حسابه
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRecharge} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        رقم هاتف العميل
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={rechargeForm.phone}
                        onChange={(e) => {
                          setRechargeForm({ ...rechargeForm, phone: e.target.value });
                          if (phoneError) setPhoneError('');
                        }}
                        placeholder="05XXXXXXXX"
                        dir="ltr"
                        className={`h-12 text-lg ${phoneError ? 'border-red-500' : ''}`}
                        required
                        maxLength={15}
                      />
                      {phoneError && (
                        <p className="text-sm text-red-500 mt-1">{phoneError}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount" className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        المبلغ (دج)
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        step="1"
                        min="100"
                        max="50000"
                        value={rechargeForm.amount}
                        onChange={(e) => {
                          setRechargeForm({ ...rechargeForm, amount: e.target.value });
                          if (amountError) setAmountError('');
                        }}
                        placeholder="1000"
                        className={`h-12 text-lg ${amountError ? 'border-red-500' : ''}`}
                        required
                      />
                      {amountError && (
                        <p className="text-sm text-red-500 mt-1">{amountError}</p>
                      )}
                      
                      {/* Quick Amount Buttons */}
                      <div className="flex gap-2 mt-2">
                        {quickAmounts.map((quickAmount) => (
                          <Button
                            key={quickAmount}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setRechargeForm({ ...rechargeForm, amount: quickAmount.toString() })}
                            className="flex-1"
                          >
                            {quickAmount}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Commission Display */}
                    {commissionInfo && amount >= 100 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                      >
                        <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <AlertTitle className="text-green-800 dark:text-green-300 text-lg">
                            خذ من الزبون: {Math.floor(commissionInfo.total_from_customer)} دج
                          </AlertTitle>
                          <AlertDescription className="text-green-700 dark:text-green-400 space-y-1 mt-2">
                            <div className="flex justify-between">
                              <span>المبلغ المُشحن:</span>
                              <span className="font-medium">{Math.floor(amount)} دج</span>
                            </div>
                            <div className="flex justify-between">
                              <span>عمولتك ({merchant.commission_rate}%):</span>
                              <span className="font-medium text-green-600">+{commissionInfo.commission_amount.toFixed(0)} دج</span>
                            </div>
                          </AlertDescription>
                        </Alert>
                      </motion.div>
                    )}

                    {/* Balance Warning */}
                    {amount > 0 && !hasEnoughBalance && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          رصيدك غير كافي. لديك {Math.floor(userBalance)} دج وتحتاج {Math.floor(amount)} دج
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full h-14 text-lg" 
                      disabled={submitting || !merchant.is_active || !hasEnoughBalance || amount < 100}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                          جاري الشحن...
                        </>
                      ) : (
                        <>
                          <Zap className="ml-2 h-5 w-5" />
                          شحن الآن
                        </>
                      )}
                    </Button>

                    {!merchant.is_active && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          حسابك غير نشط. تواصل مع الإدارة لتفعيله
                        </AlertDescription>
                      </Alert>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-primary" />
                    </div>
                    سجل المعاملات
                  </CardTitle>
                  <CardDescription>
                    آخر {transactions.length} معاملة قمت بها
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <Receipt className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">لا توجد معاملات بعد</p>
                      <p className="text-sm text-muted-foreground mt-1">ابدأ بشحن رصيد لعملائك</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((tx, index) => {
                        const txType = transactionTypeLabels[tx.transaction_type] || {
                          label: tx.transaction_type,
                          icon: Receipt,
                          color: 'text-gray-600'
                        };
                        const TxIcon = txType.icon;
                        
                        return (
                          <motion.div
                            key={tx.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                          >
                            <div className={`w-12 h-12 rounded-full bg-background flex items-center justify-center ${txType.color}`}>
                              <TxIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{txType.label}</p>
                              {tx.customer_phone && (
                                <p className="text-sm text-muted-foreground truncate" dir="ltr">
                                  {tx.customer_phone}
                                </p>
                              )}
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Clock className="h-3 w-3" />
                                {new Date(tx.created_at).toLocaleString('ar-DZ')}
                              </div>
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-lg">
                                {Math.floor(tx.amount)} دج
                              </p>
                              {tx.commission_amount !== null && tx.commission_amount > 0 && (
                                <p className="text-sm text-green-600 font-medium">
                                  +{Math.floor(tx.commission_amount)} عمولة
                                </p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default MerchantDashboard;
