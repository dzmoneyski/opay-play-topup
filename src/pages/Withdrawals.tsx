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

const WithdrawalMethods = {
  opay: { name: "OPay", icon: CreditCard },
  barid_bank: { name: "بريد الجزائر", icon: Banknote },
  ccp: { name: "البريد والمواصلات CCP", icon: Banknote },
  cash: { name: "سحب نقدي", icon: MapPin }
};

export default function Withdrawals() {
  const { balance, loading: balanceLoading } = useBalance();
  const { withdrawals, loading, createWithdrawal } = useWithdrawals();
  const { toast } = useToast();

  const [selectedMethod, setSelectedMethod] = React.useState<string>('opay');
  const [formData, setFormData] = React.useState({
    amount: '',
    account_number: '',
    account_holder_name: '',
    cash_location: '',
    notes: ''
  });
  const [submitting, setSubmitting] = React.useState(false);

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
    const totalAmount = amount + 50; // إضافة العمولة
    if ((balance?.balance || 0) < totalAmount) {
      toast({
        title: "رصيد غير كافي",
        description: `رصيدك الحالي ${(balance?.balance || 0).toFixed(2)} دج غير كافي للسحب مع العمولة`,
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
        amount: totalAmount,
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

        <Tabs value={selectedMethod} onValueChange={setSelectedMethod} className="space-y-6">
          {/* Withdrawal Method Selection */}
          <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-sm">
            <TabsTrigger value="opay" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              OPay
            </TabsTrigger>
            <TabsTrigger value="barid_bank" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              بريد الجزائر
            </TabsTrigger>
            <TabsTrigger value="ccp" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              CCP
            </TabsTrigger>
            <TabsTrigger value="cash" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              سحب نقدي
            </TabsTrigger>
          </TabsList>

          {/* OPay Withdrawal */}
          <TabsContent value="opay" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  سحب عبر OPay
                </CardTitle>
                <CardDescription>
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

                  {/* عرض العمولة */}
                  {formData.amount && (
                    <div className="p-4 bg-gradient-primary rounded-lg text-white">
                      <h3 className="font-semibold mb-2">تفاصيل السحب</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>المبلغ المطلوب:</span>
                          <span>{formatCurrency(parseFloat(formData.amount) || 0)} دج</span>
                        </div>
                        <div className="flex justify-between">
                          <span>عمولة السحب:</span>
                          <span>50.00 دج</span>
                        </div>
                        <Separator className="my-2 bg-white/20" />
                        <div className="flex justify-between font-semibold">
                          <span>إجمالي المخصوم:</span>
                          <span>{formatCurrency((parseFloat(formData.amount) || 0) + 50)} دج</span>
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
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  سحب عبر بريد الجزائر
                </CardTitle>
                <CardDescription>
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

                  {/* عرض العمولة */}
                  {formData.amount && (
                    <div className="p-4 bg-gradient-primary rounded-lg text-white">
                      <h3 className="font-semibold mb-2">تفاصيل السحب</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>المبلغ المطلوب:</span>
                          <span>{formatCurrency(parseFloat(formData.amount) || 0)} دج</span>
                        </div>
                        <div className="flex justify-between">
                          <span>عمولة السحب:</span>
                          <span>50.00 دج</span>
                        </div>
                        <Separator className="my-2 bg-white/20" />
                        <div className="flex justify-between font-semibold">
                          <span>إجمالي المخصوم:</span>
                          <span>{formatCurrency((parseFloat(formData.amount) || 0) + 50)} دج</span>
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
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  سحب عبر CCP
                </CardTitle>
                <CardDescription>
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

                  {/* عرض العمولة */}
                  {formData.amount && (
                    <div className="p-4 bg-gradient-primary rounded-lg text-white">
                      <h3 className="font-semibold mb-2">تفاصيل السحب</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>المبلغ المطلوب:</span>
                          <span>{formatCurrency(parseFloat(formData.amount) || 0)} دج</span>
                        </div>
                        <div className="flex justify-between">
                          <span>عمولة السحب:</span>
                          <span>50.00 دج</span>
                        </div>
                        <Separator className="my-2 bg-white/20" />
                        <div className="flex justify-between font-semibold">
                          <span>إجمالي المخصوم:</span>
                          <span>{formatCurrency((parseFloat(formData.amount) || 0) + 50)} دج</span>
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

          {/* Cash Withdrawal */}
          <TabsContent value="cash" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  سحب نقدي
                </CardTitle>
                <CardDescription>
                  حدد موقع الاستلام المفضل لاستلام المبلغ نقداً
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

                  {/* عرض العمولة */}
                  {formData.amount && (
                    <div className="p-4 bg-gradient-primary rounded-lg text-white">
                      <h3 className="font-semibold mb-2">تفاصيل السحب</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>المبلغ المطلوب:</span>
                          <span>{formatCurrency(parseFloat(formData.amount) || 0)} دج</span>
                        </div>
                        <div className="flex justify-between">
                          <span>عمولة السحب:</span>
                          <span>50.00 دج</span>
                        </div>
                        <Separator className="my-2 bg-white/20" />
                        <div className="flex justify-between font-semibold">
                          <span>إجمالي المخصوم:</span>
                          <span>{formatCurrency((parseFloat(formData.amount) || 0) + 50)} دج</span>
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
                        إرسال طلب السحب النقدي
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
        <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              تاريخ عمليات السحب
            </CardTitle>
            <CardDescription>
              جميع طلبات السحب السابقة
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-8">
                <ArrowUpRight className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد عمليات سحب سابقة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {withdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{formatCurrency(withdrawal.amount)} دج</span>
                        <span className="text-sm text-muted-foreground">
                          عبر {WithdrawalMethods[withdrawal.withdrawal_method as keyof typeof WithdrawalMethods]?.name || withdrawal.withdrawal_method}
                        </span>
                      </div>
                      {getStatusBadge(withdrawal.status)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {withdrawal.withdrawal_method === 'cash' ? (
                        <p>موقع الاستلام: {withdrawal.cash_location}</p>
                      ) : (
                        <>
                          <p>رقم الحساب: {withdrawal.account_number}</p>
                          <p>اسم الحساب: {withdrawal.account_holder_name}</p>
                        </>
                      )}
                      <p>تاريخ الطلب: {formatDate(withdrawal.created_at)}</p>
                      {withdrawal.admin_notes && (
                        <p className="text-blue-600 font-medium">ملاحظة: {withdrawal.admin_notes}</p>
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