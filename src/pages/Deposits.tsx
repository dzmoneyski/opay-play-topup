import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDeposits, PaymentMethod } from '@/hooks/useDeposits';
import { useBalance } from '@/hooks/useBalance';
import { useToast } from '@/hooks/use-toast';
import { useFeeSettings } from '@/hooks/useFeeSettings';
import { calculateFee, formatCurrency } from '@/lib/feeCalculator';
import { usePaymentWallets } from '@/hooks/usePaymentWallets';
import { 
  CreditCard,
  Upload,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Banknote,
  Wallet,
  Receipt,
  Building2,
  HandCoins
} from 'lucide-react';
import BackButton from '@/components/BackButton';

export default function Deposits() {
  const { deposits, loading, createDeposit } = useDeposits();
  const { balance, loading: balanceLoading, fetchBalance } = useBalance();
  const { toast } = useToast();
  const { feeSettings } = useFeeSettings();
  const { wallets, loading: walletsLoading } = usePaymentWallets();
  const [selectedMethod, setSelectedMethod] = React.useState<PaymentMethod>('baridimob');
  const [amount, setAmount] = React.useState('');
  const [transactionId, setTransactionId] = React.useState('');
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // حساب الرسوم
  const depositAmount = parseFloat(amount) || 0;
  const depositFee = calculateFee(depositAmount, feeSettings?.deposit_fees || null);
  const netAmount = depositFee.net_amount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !transactionId || !receiptFile) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      toast({
        title: "مبلغ غير صحيح",
        description: "يرجى إدخال مبلغ صحيح",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    const result = await createDeposit(selectedMethod, amountNumber, transactionId, receiptFile);
    
    if (result.success) {
      // Reset form
      setAmount('');
      setTransactionId('');
      setReceiptFile(null);
      // Refresh balance after successful deposit
      fetchBalance();
    }
    
    setSubmitting(false);
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
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            مقبول
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

  return (
    <div className="min-h-screen bg-gradient-hero p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <BackButton />
        
        {/* Header */}
        <div className="text-center text-white space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <Wallet className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">إيداع الأموال</h1>
              <p className="text-white/80">اختر طريقة الدفع المناسبة لك</p>
            </div>
          </div>
        </div>

        {/* Current Balance */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">الرصيد الحالي</p>
                {balanceLoading ? (
                  <div className="h-8 bg-muted rounded animate-pulse w-24 mx-auto" />
                ) : (
                  <p className="text-2xl font-bold text-primary">
                    {balance?.balance?.toFixed(2) || '0.00'} دج
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={selectedMethod} onValueChange={(value) => setSelectedMethod(value as PaymentMethod)} className="space-y-6">
          {/* Payment Method Selection */}
          <TabsList className="grid w-full grid-cols-5 bg-white/10 backdrop-blur-sm">
            <TabsTrigger value="baridimob" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              Baridimob
            </TabsTrigger>
            <TabsTrigger value="ccp" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              CCP
            </TabsTrigger>
            <TabsTrigger value="edahabiya" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              Edahabiya
            </TabsTrigger>
            <TabsTrigger value="atm" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              صراف آلي
            </TabsTrigger>
            <TabsTrigger value="cash" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              كاش
            </TabsTrigger>
          </TabsList>

          {/* Deposit Form */}
          <TabsContent value="baridimob" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  إيداع عبر Baridimob
                </CardTitle>
                <CardDescription>
                  أرسل المال إلى المحفظة المحددة أدناه ثم املأ النموذج
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Wallet Information */}
                <div className="p-4 bg-gradient-primary rounded-lg text-white">
                  <h3 className="font-semibold mb-2">محفظة الإيداع</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-mono">
                      {walletsLoading ? "جاري التحميل..." : (wallets?.baridimob || "0551234567")}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(wallets?.baridimob || "0551234567")}
                    >
                      نسخ
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Deposit Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">المبلغ المرسل (دج)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="مثال: 5000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        min="1"
                        step="0.01"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="transactionId">معرف المعاملة</Label>
                      <Input
                        id="transactionId"
                        type="text"
                        placeholder="معرف المعاملة من Baridimob"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Fee Preview */}
                  {depositAmount > 0 && (
                    <div className="p-4 bg-gradient-secondary/10 rounded-xl border border-accent/20">
                      <h3 className="font-semibold text-foreground mb-3">ملخص الإيداع</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المبلغ المرسل:</span>
                          <span className="font-medium text-foreground">{formatCurrency(depositAmount)} دج</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">رسوم الإيداع:</span>
                          <span className="font-medium text-foreground">{formatCurrency(depositFee.fee_amount)} دج</span>
                        </div>
                        <div className="h-px bg-border my-2"></div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-foreground">صافي المبلغ المضاف لرصيدك:</span>
                          <span className="text-green-600">{formatCurrency(netAmount)} دج</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="receipt">صورة الوصل</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="receipt"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        required
                        className="cursor-pointer"
                      />
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                    {receiptFile && (
                      <p className="text-sm text-muted-foreground">
                        تم اختيار: {receiptFile.name}
                      </p>
                    )}
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
                        إرسال طلب الإيداع
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ccp" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  إيداع عبر CCP
                </CardTitle>
                <CardDescription>
                  قريباً - خدمة CCP قيد التطوير
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">هذه الخدمة ستكون متاحة قريباً</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="edahabiya" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  إيداع عبر Edahabiya
                </CardTitle>
                <CardDescription>
                  قريباً - خدمة Edahabiya قيد التطوير
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">هذه الخدمة ستكون متاحة قريباً</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="atm" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  إيداع عبر الصراف الآلي
                </CardTitle>
                <CardDescription>
                  قم بالإيداع عبر الصراف الآلي ثم املأ النموذج
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* ATM Instructions */}
                <div className="p-4 bg-gradient-primary rounded-lg text-white">
                  <h3 className="font-semibold mb-2">معلومات الإيداع</h3>
                  <div className="space-y-2 text-sm">
                    <p>• توجه إلى أقرب صراف آلي</p>
                    <p>• قم بإيداع المبلغ في الحساب المحدد</p>
                    <p>• احتفظ بإيصال الإيداع</p>
                    <p>• املأ النموذج أدناه وأرفق صورة الإيصال</p>
                  </div>
                </div>

                <Separator />

                {/* Deposit Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">المبلغ المودع (دج)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="مثال: 5000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        min="1"
                        step="0.01"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="transactionId">رقم الإيصال</Label>
                      <Input
                        id="transactionId"
                        type="text"
                        placeholder="رقم إيصال الصراف الآلي"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Fee Preview */}
                  {depositAmount > 0 && (
                    <div className="p-4 bg-gradient-secondary/10 rounded-xl border border-accent/20">
                      <h3 className="font-semibold text-foreground mb-3">ملخص الإيداع</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المبلغ المودع:</span>
                          <span className="font-medium text-foreground">{formatCurrency(depositAmount)} دج</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">رسوم الإيداع:</span>
                          <span className="font-medium text-foreground">{formatCurrency(depositFee.fee_amount)} دج</span>
                        </div>
                        <div className="h-px bg-border my-2"></div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-foreground">صافي المبلغ المضاف لرصيدك:</span>
                          <span className="text-green-600">{formatCurrency(netAmount)} دج</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="receipt">صورة الإيصال</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="receipt"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        required
                        className="cursor-pointer"
                      />
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                    {receiptFile && (
                      <p className="text-sm text-muted-foreground">
                        تم اختيار: {receiptFile.name}
                      </p>
                    )}
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
                        إرسال طلب الإيداع
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cash" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HandCoins className="h-5 w-5" />
                  إيداع نقدي (كاش)
                </CardTitle>
                <CardDescription>
                  قم بالإيداع النقدي في أحد فروعنا ثم املأ النموذج
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Cash Instructions */}
                <div className="p-4 bg-gradient-primary rounded-lg text-white">
                  <h3 className="font-semibold mb-2">تعليمات الإيداع النقدي</h3>
                  <div className="space-y-2 text-sm">
                    <p>• توجه إلى أحد فروعنا المعتمدة</p>
                    <p>• قم بتسليم المبلغ النقدي للموظف المختص</p>
                    <p>• احصل على إيصال الإيداع</p>
                    <p>• املأ النموذج أدناه وأرفق صورة الإيصال</p>
                  </div>
                </div>

                <Separator />

                {/* Deposit Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">المبلغ المودع (دج)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="مثال: 5000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        min="1"
                        step="0.01"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="transactionId">رقم الإيصال</Label>
                      <Input
                        id="transactionId"
                        type="text"
                        placeholder="رقم إيصال الإيداع النقدي"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Fee Preview */}
                  {depositAmount > 0 && (
                    <div className="p-4 bg-gradient-secondary/10 rounded-xl border border-accent/20">
                      <h3 className="font-semibold text-foreground mb-3">ملخص الإيداع</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المبلغ المودع:</span>
                          <span className="font-medium text-foreground">{formatCurrency(depositAmount)} دج</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">رسوم الإيداع:</span>
                          <span className="font-medium text-foreground">{formatCurrency(depositFee.fee_amount)} دج</span>
                        </div>
                        <div className="h-px bg-border my-2"></div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-foreground">صافي المبلغ المضاف لرصيدك:</span>
                          <span className="text-green-600">{formatCurrency(netAmount)} دج</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="receipt">صورة الإيصال</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="receipt"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        required
                        className="cursor-pointer"
                      />
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                    {receiptFile && (
                      <p className="text-sm text-muted-foreground">
                        تم اختيار: {receiptFile.name}
                      </p>
                    )}
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
                        إرسال طلب الإيداع
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Deposit History */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              تاريخ الإيداعات
            </CardTitle>
            <CardDescription>
              جميع طلبات الإيداع السابقة
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : deposits.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد عمليات إيداع سابقة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {deposits.map((deposit) => (
                  <div key={deposit.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{deposit.amount} دج</span>
                        <span className="text-sm text-muted-foreground">
                          عبر {deposit.payment_method}
                        </span>
                      </div>
                      {getStatusBadge(deposit.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>معرف المعاملة: {deposit.transaction_id}</p>
                      <p>تاريخ الإرسال: {formatDate(deposit.created_at)}</p>
                      {deposit.admin_notes && (
                        <p className="text-blue-600 font-medium">ملاحظة: {deposit.admin_notes}</p>
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