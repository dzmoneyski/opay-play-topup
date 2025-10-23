import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useBalance } from '@/hooks/useBalance';
import { useWithdrawals } from '@/hooks/useWithdrawals';
import { useToast } from '@/hooks/use-toast';
import { useFeeSettings } from '@/hooks/useFeeSettings';
import { calculateFee, formatCurrency } from '@/lib/feeCalculator';
import { 
  ArrowUpRight,
  MapPin,
  Banknote,
  CreditCard,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Wallet,
  Receipt
} from 'lucide-react';
import BackButton from '@/components/BackButton';

import opayLogo from '@/assets/opay-final-logo.png';
import baridLogo from '@/assets/baridimob-logo.png';
import ccpLogo from '@/assets/ccp-logo.png';
import albarakaLogo from '@/assets/albaraka-logo.png';
import badrLogo from '@/assets/badr-logo.png';
import cardlessLogo from '@/assets/cardless-withdrawal-logo.png';
import { LucideIcon } from 'lucide-react';

type WithdrawalMethod = {
  name: string;
  logo?: string;
  icon?: LucideIcon;
};

const WithdrawalMethods: Record<string, WithdrawalMethod> = {
  opay: { name: "OPay", logo: opayLogo },
  barid_bank: { name: "بريد الجزائر", logo: baridLogo },
  ccp: { name: "CCP", logo: ccpLogo },
  albaraka: { name: "بنك البركة", logo: albarakaLogo },
  badr: { name: "بنك البدر", logo: badrLogo },
  cash: { name: "السحب بدون بطاقة", logo: cardlessLogo }
};

export default function Withdrawals() {
  const { balance, loading: balanceLoading } = useBalance();
  const { withdrawals, loading, createWithdrawal } = useWithdrawals();
  const { toast } = useToast();
  const { feeSettings } = useFeeSettings();

  const [selectedMethod, setSelectedMethod] = React.useState<string>('opay');
  const [formData, setFormData] = React.useState({
    amount: '',
    account_number: '',
    account_holder_name: '',
    cash_location: '',
    notes: ''
  });
  const [submitting, setSubmitting] = React.useState(false);

  // حساب الرسوم
  const withdrawalAmount = parseFloat(formData.amount) || 0;
  const withdrawalFee = calculateFee(withdrawalAmount, feeSettings?.withdrawal_fees || null);
  const totalDeducted = withdrawalAmount + withdrawalFee.fee_amount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال المبلغ المطلوب سحبه",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    
    // التحقق من الحد الأدنى والأقصى للسحب
    if (amount < 500) {
      toast({
        title: "مبلغ غير صحيح",
        description: "الحد الأدنى للسحب هو 500 دج",
        variant: "destructive"
      });
      return;
    }

    if (amount > 200000) {
      toast({
        title: "مبلغ غير صحيح",
        description: "الحد الأقصى للسحب هو 200,000 دج",
        variant: "destructive"
      });
      return;
    }

    // التحقق من الرصيد المتاح
    if ((balance?.balance || 0) < totalDeducted) {
      toast({
        title: "رصيد غير كافي",
        description: `رصيدك الحالي ${formatCurrency(balance?.balance || 0)} دج غير كافي للسحب مع الرسوم`,
        variant: "destructive"
      });
      return;
    }

    // التحقق من الحقول المطلوبة حسب طريقة السحب
    if (selectedMethod === 'cash' && !formData.cash_location) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى تحديد موقع الاستلام للسحب النقدي",
        variant: "destructive"
      });
      return;
    }

    if (selectedMethod !== 'cash' && (!formData.account_number || !formData.account_holder_name)) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال رقم الحساب واسم صاحب الحساب",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      await createWithdrawal({
        amount: totalDeducted,
        withdrawal_method: selectedMethod,
        account_number: formData.account_number || undefined,
        account_holder_name: formData.account_holder_name || undefined,
        cash_location: formData.cash_location || undefined,
        notes: formData.notes || undefined
      });

      toast({
        title: "تم إرسال طلب السحب بنجاح",
        description: "سيتم مراجعة طلبك ومعالجته خلال 24 ساعة"
      });

      // إعادة تعيين النموذج
      setFormData({
        amount: '',
        account_number: '',
        account_holder_name: '',
        cash_location: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating withdrawal:', error);
      toast({
        title: "خطأ في الإرسال",
        description: "فشل في إرسال طلب السحب. يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            قيد المراجعة
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            معتمد
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            مكتمل
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            مرفوض
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gradient-hero p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <BackButton />
        
        {/* Header */}
        <div className="text-center text-white space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <ArrowUpRight className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">سحب الأموال</h1>
              <p className="text-white/80">اختر طريقة السحب المناسبة لك</p>
            </div>
          </div>
        </div>

        {/* Current Balance */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">الرصيد المتاح</p>
                {balanceLoading ? (
                  <div className="h-8 bg-muted rounded animate-pulse w-24 mx-auto" />
                ) : (
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(balance?.balance || 0)} دج
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Method Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {Object.entries(WithdrawalMethods).map(([key, method]) => (
            <button
              key={key}
              onClick={() => setSelectedMethod(key)}
              className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                selectedMethod === key
                  ? 'border-primary bg-white shadow-xl scale-105'
                  : 'border-white/30 bg-white/10 backdrop-blur-sm hover:border-white/50 hover:bg-white/20'
              }`}
            >
              <div className="flex flex-col items-center gap-4">
                {method.logo ? (
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <div className={`absolute inset-0 rounded-2xl transition-opacity ${
                      selectedMethod === key ? 'bg-primary/10 opacity-100' : 'opacity-0 group-hover:opacity-50'
                    }`}></div>
                    <div className="relative w-20 h-20 flex items-center justify-center p-2 bg-white rounded-xl shadow-sm">
                      <img 
                        src={method.logo} 
                        alt={method.name} 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                ) : method.icon && (
                  <div className={`relative w-24 h-24 flex items-center justify-center p-4 rounded-2xl transition-all ${
                    selectedMethod === key 
                      ? 'bg-gradient-primary' 
                      : 'bg-white/10 group-hover:bg-white/20'
                  }`}>
                    <method.icon className={`h-12 w-12 ${
                      selectedMethod === key ? 'text-white' : 'text-white/70 group-hover:text-white'
                    }`} />
                  </div>
                )}
                <div className="text-center">
                  <p className={`text-sm font-medium transition-colors ${
                    selectedMethod === key ? 'text-primary' : 'text-white group-hover:text-white'
                  }`}>
                    {method.name}
                  </p>
                </div>
              </div>
              {selectedMethod === key && (
                <div className="absolute -top-2 -right-2">
                  <CheckCircle className="w-6 h-6 text-primary fill-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        <Tabs value={selectedMethod} onValueChange={setSelectedMethod} className="space-y-6">

          {/* OPay Withdrawal */}
          <TabsContent value="opay" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-2 border-primary/20">
              <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <img src={opayLogo} alt="OPay" className="h-8 w-8 object-contain" />
                  </div>
                  <span className="text-2xl">سحب عبر OPay</span>
                </CardTitle>
                <CardDescription className="text-base">
                  املأ بيانات حساب OPay الخاص بك لتلقي المبلغ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">المبلغ المطلوب سحبه (دج)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="مثال: 5000"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                        min="500"
                        max="200000"
                        step="0.01"
                      />
                      <p className="text-xs text-muted-foreground">
                        الحد الأدنى: 500 دج • الحد الأقصى: 200,000 دج
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="account_number">رقم محفظة OPay</Label>
                      <Input
                        id="account_number"
                        type="text"
                        placeholder="رقم محفظة OPay"
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account_holder_name">اسم صاحب المحفظة</Label>
                    <Input
                      id="account_holder_name"
                      type="text"
                      placeholder="الاسم الكامل لصاحب المحفظة"
                      value={formData.account_holder_name}
                      onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                      required
                    />
                  </div>

                  {/* عرض الرسوم */}
                  {withdrawalAmount > 0 && (
                    <div className="p-4 bg-gradient-secondary/10 rounded-xl border border-accent/20">
                      <h3 className="font-semibold text-foreground mb-3">تفاصيل السحب</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المبلغ المطلوب:</span>
                          <span className="font-medium text-foreground">{formatCurrency(withdrawalAmount)} دج</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">رسوم السحب:</span>
                          <span className="font-medium text-foreground">{formatCurrency(withdrawalFee.fee_amount)} دج</span>
                        </div>
                        <div className="h-px bg-border my-2"></div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-foreground">إجمالي المخصوم من رصيدك:</span>
                          <span className="text-primary">{formatCurrency(totalDeducted)} دج</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes">ملاحظات إضافية (اختياري)</Label>
                    <Textarea
                      id="notes"
                      placeholder="أي ملاحظات إضافية..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:opacity-90"
                    disabled={submitting || loading}
                    size="lg"
                  >
                    {submitting ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        إرسال طلب السحب
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Barid Bank Withdrawal */}
          <TabsContent value="barid_bank" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-2 border-primary/20">
              <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <img src={baridLogo} alt="بريد الجزائر" className="h-8 w-8 object-contain" />
                  </div>
                  <span className="text-2xl">سحب عبر بريد الجزائر</span>
                </CardTitle>
                <CardDescription className="text-base">
                  املأ بيانات حساب بريد الجزائر الخاص بك لتلقي المبلغ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">المبلغ المطلوب سحبه (دج)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="مثال: 5000"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                        min="500"
                        max="200000"
                        step="0.01"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="account_number">رقم الحساب</Label>
                      <Input
                        id="account_number"
                        type="text"
                        placeholder="رقم حساب بريد الجزائر"
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account_holder_name">اسم صاحب الحساب</Label>
                    <Input
                      id="account_holder_name"
                      type="text"
                      placeholder="الاسم الكامل لصاحب الحساب"
                      value={formData.account_holder_name}
                      onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                      required
                    />
                  </div>

                  {/* عرض الرسوم */}
                  {withdrawalAmount > 0 && (
                    <div className="p-4 bg-gradient-secondary/10 rounded-xl border border-accent/20">
                      <h3 className="font-semibold text-foreground mb-3">تفاصيل السحب</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المبلغ المطلوب:</span>
                          <span className="font-medium text-foreground">{formatCurrency(withdrawalAmount)} دج</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">رسوم السحب:</span>
                          <span className="font-medium text-foreground">{formatCurrency(withdrawalFee.fee_amount)} دج</span>
                        </div>
                        <div className="h-px bg-border my-2"></div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-foreground">إجمالي المخصوم من رصيدك:</span>
                          <span className="text-primary">{formatCurrency(totalDeducted)} دج</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes">ملاحظات إضافية (اختياري)</Label>
                    <Textarea
                      id="notes"
                      placeholder="أي ملاحظات إضافية..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:opacity-90"
                    disabled={submitting || loading}
                    size="lg"
                  >
                    {submitting ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        إرسال طلب السحب
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CCP Withdrawal */}
          <TabsContent value="ccp" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-2 border-primary/20">
              <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <img src={ccpLogo} alt="CCP" className="h-8 w-8 object-contain" />
                  </div>
                  <span className="text-2xl">سحب عبر CCP</span>
                </CardTitle>
                <CardDescription className="text-base">
                  املأ بيانات حساب CCP الخاص بك لتلقي المبلغ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">المبلغ المطلوب سحبه (دج)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="مثال: 5000"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                        min="500"
                        max="200000"
                        step="0.01"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="account_number">رقم الحساب CCP</Label>
                      <Input
                        id="account_number"
                        type="text"
                        placeholder="رقم حساب CCP"
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account_holder_name">اسم صاحب الحساب</Label>
                    <Input
                      id="account_holder_name"
                      type="text"
                      placeholder="الاسم الكامل لصاحب الحساب"
                      value={formData.account_holder_name}
                      onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                      required
                    />
                  </div>

                  {/* عرض الرسوم */}
                  {withdrawalAmount > 0 && (
                    <div className="p-4 bg-gradient-secondary/10 rounded-xl border border-accent/20">
                      <h3 className="font-semibold text-foreground mb-3">تفاصيل السحب</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المبلغ المطلوب:</span>
                          <span className="font-medium text-foreground">{formatCurrency(withdrawalAmount)} دج</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">رسوم السحب:</span>
                          <span className="font-medium text-foreground">{formatCurrency(withdrawalFee.fee_amount)} دج</span>
                        </div>
                        <div className="h-px bg-border my-2"></div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-foreground">إجمالي المخصوم من رصيدك:</span>
                          <span className="text-primary">{formatCurrency(totalDeducted)} دج</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes">ملاحظات إضافية (اختياري)</Label>
                    <Textarea
                      id="notes"
                      placeholder="أي ملاحظات إضافية..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:opacity-90"
                    disabled={submitting || loading}
                    size="lg"
                  >
                    {submitting ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        إرسال طلب السحب
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Albaraka Bank - Coming Soon */}
          <TabsContent value="albaraka" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-2 border-primary/20">
              <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <img src={albarakaLogo} alt="بنك البركة" className="h-8 w-8 object-contain" />
                  </div>
                  <span className="text-2xl">سحب عبر بنك البركة</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-12">
                <div className="text-center space-y-6">
                  <div className="mx-auto w-24 h-24 bg-gradient-primary/10 rounded-full flex items-center justify-center">
                    <Clock className="h-12 w-12 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-bold text-primary">قريباً</h3>
                    <p className="text-lg text-muted-foreground">
                      سيتوفر السحب عبر بنك البركة قريباً
                    </p>
                    <p className="text-sm text-muted-foreground">
                      نعمل على إضافة هذه الميزة لتسهيل عمليات السحب
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Badr Bank - Coming Soon */}
          <TabsContent value="badr" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-2 border-primary/20">
              <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <img src={badrLogo} alt="بنك البدر" className="h-8 w-8 object-contain" />
                  </div>
                  <span className="text-2xl">سحب عبر بنك البدر</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-12">
                <div className="text-center space-y-6">
                  <div className="mx-auto w-24 h-24 bg-gradient-primary/10 rounded-full flex items-center justify-center">
                    <Clock className="h-12 w-12 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-bold text-primary">قريباً</h3>
                    <p className="text-lg text-muted-foreground">
                      سيتوفر السحب عبر بنك البدر قريباً
                    </p>
                    <p className="text-sm text-muted-foreground">
                      نعمل على إضافة هذه الميزة لتسهيل عمليات السحب
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Withdrawal */}
          <TabsContent value="cash" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-2 border-primary/20">
              <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <img src={cardlessLogo} alt="السحب بدون بطاقة" className="h-8 w-8 object-contain" />
                  </div>
                  <span className="text-2xl">السحب بدون بطاقة</span>
                </CardTitle>
                <CardDescription className="text-base">
                  حدد موقع الاستلام المناسب للسحب من الصراف الآلي بدون بطاقة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">المبلغ المطلوب سحبه (دج)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="مثال: 5000"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                        min="500"
                        max="200000"
                        step="0.01"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cash_location">موقع الاستلام</Label>
                      <Input
                        id="cash_location"
                        type="text"
                        placeholder="مثال: وسط المدينة - الجزائر العاصمة"
                        value={formData.cash_location}
                        onChange={(e) => setFormData({ ...formData, cash_location: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* عرض الرسوم */}
                  {withdrawalAmount > 0 && (
                    <div className="p-4 bg-gradient-secondary/10 rounded-xl border border-accent/20">
                      <h3 className="font-semibold text-foreground mb-3">تفاصيل السحب</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المبلغ المطلوب:</span>
                          <span className="font-medium text-foreground">{formatCurrency(withdrawalAmount)} دج</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">رسوم السحب:</span>
                          <span className="font-medium text-foreground">{formatCurrency(withdrawalFee.fee_amount)} دج</span>
                        </div>
                        <div className="h-px bg-border my-2"></div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-foreground">إجمالي المخصوم من رصيدك:</span>
                          <span className="text-primary">{formatCurrency(totalDeducted)} دج</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes">ملاحظات إضافية (اختياري)</Label>
                    <Textarea
                      id="notes"
                      placeholder="أي ملاحظات إضافية حول موقع الاستلام أو وقت مفضل..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:opacity-90"
                    disabled={submitting || loading}
                    size="lg"
                  >
                    {submitting ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        إرسال طلب السحب بدون بطاقة
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Withdrawal History */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-2 border-primary/10">
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 bg-gradient-primary rounded-lg shadow-sm">
                <Receipt className="h-6 w-6 text-white" />
              </div>
              تاريخ عمليات السحب
            </CardTitle>
            <CardDescription className="text-base">
              جميع طلبات السحب السابقة
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-muted/30 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-20 h-20 bg-gradient-primary/10 rounded-2xl flex items-center justify-center mb-4">
                  <ArrowUpRight className="h-10 w-10 text-primary" />
                </div>
                <p className="text-muted-foreground text-lg">لا توجد عمليات سحب سابقة</p>
                <p className="text-sm text-muted-foreground/70 mt-2">ابدأ أول عملية سحب الآن</p>
              </div>
            ) : (
              <div className="space-y-4">
                {withdrawals.map((withdrawal) => (
                  <div 
                    key={withdrawal.id} 
                    className="relative border-2 border-border/50 rounded-xl p-5 space-y-3 hover:border-primary/30 hover:shadow-md transition-all bg-gradient-to-br from-white to-white/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-primary rounded-lg">
                          <ArrowUpRight className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-xl text-foreground">{formatCurrency(withdrawal.amount)} دج</p>
                          <p className="text-sm text-muted-foreground">
                            عبر {WithdrawalMethods[withdrawal.withdrawal_method as keyof typeof WithdrawalMethods]?.name || withdrawal.withdrawal_method}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(withdrawal.status)}
                    </div>
                    <Separator />
                    <div className="text-sm text-muted-foreground space-y-2">
                      {withdrawal.withdrawal_method === 'cash' ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span>موقع الاستلام: {withdrawal.cash_location}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-primary" />
                            <span>رقم الحساب: {withdrawal.account_number}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-primary" />
                            <span>اسم الحساب: {withdrawal.account_holder_name}</span>
                          </div>
                        </>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>تاريخ الطلب: {formatDate(withdrawal.created_at)}</span>
                      </div>
                      {withdrawal.admin_notes && (
                        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-blue-700 dark:text-blue-400 font-medium text-sm">
                            <span className="font-bold">ملاحظة: </span>
                            {withdrawal.admin_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}