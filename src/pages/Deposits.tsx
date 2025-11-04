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
  HandCoins,
  Eye,
  EyeOff,
  Copy,
  Check,
  Phone,
  AlertCircle,
  MessageCircle
} from 'lucide-react';
import BackButton from '@/components/BackButton';
import baridimobLogo from '@/assets/baridimob-logo.png';
import ccpLogo from '@/assets/ccp-logo.png';
import edahabiyaLogo from '@/assets/edahabiya-logo.png';
import albarakaLogo from '@/assets/albaraka-logo.png';
import badrLogo from '@/assets/badr-logo.png';

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
  const [showBalance, setShowBalance] = React.useState(true);
  const [copied, setCopied] = React.useState(false);

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

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "تم النسخ",
      description: "تم نسخ الرقم بنجاح",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const paymentMethods = [
    { 
      id: 'baridimob', 
      name: 'Baridimob', 
      logo: baridimobLogo,
      description: 'الدفع عبر محفظة بريدي موب'
    },
    { 
      id: 'ccp', 
      name: 'CCP', 
      logo: ccpLogo,
      description: 'الدفع عبر حساب البريد'
    },
    { 
      id: 'edahabiya', 
      name: 'Edahabiya', 
      logo: edahabiyaLogo,
      description: 'الدفع عبر بطاقة الذهبية'
    },
    { 
      id: 'albaraka', 
      name: 'بنك البركة', 
      logo: albarakaLogo,
      description: 'الدفع عبر بنك البركة'
    },
    { 
      id: 'badr', 
      name: 'بنك البدر', 
      logo: badrLogo,
      description: 'الدفع عبر بنك البدر'
    },
    { 
      id: 'atm', 
      name: 'صراف آلي', 
      icon: Building2,
      description: 'الإيداع عبر الصراف الآلي'
    },
    { 
      id: 'cash', 
      name: 'دفع نقدي', 
      icon: HandCoins,
      description: 'الإيداع النقدي في الفروع'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden" dir="rtl">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-primary rounded-full opacity-10 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-gold rounded-full opacity-10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container mx-auto px-4 py-6 lg:py-12 max-w-7xl relative z-10">
        <div className="mb-8">
          <BackButton />
        </div>
        
        {/* Ultra Premium Header */}
        <div className="text-center mb-12 animate-slide-up">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-primary rounded-[2.5rem] blur-2xl opacity-60 animate-pulse"></div>
            <div className="relative p-6 rounded-[2.5rem] bg-gradient-primary shadow-glow">
              <Wallet className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
            إيداع الأموال
          </h1>
          <p className="text-white/90 text-xl max-w-2xl mx-auto leading-relaxed">
            اختر طريقة الدفع المناسبة لك وأودع أموالك بسهولة وأمان
          </p>
        </div>

        {/* Ultra Premium Balance Card */}
        <div className="mb-12 animate-slide-up relative" style={{ animationDelay: '0.1s' }}>
          <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-2xl opacity-20"></div>
          <Card className="relative bg-gradient-glass backdrop-blur-2xl border-0 shadow-elevated overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <CardContent className="p-8 lg:p-10 relative z-10">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="flex-1 text-center lg:text-right">
                  <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
                    <div className="relative">
                      <div className="w-3 h-3 rounded-full bg-green-400 animate-ping absolute"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <p className="text-white/80 text-base font-semibold tracking-wide">الرصيد الحالي</p>
                  </div>
                  <div className="flex items-baseline justify-center lg:justify-start gap-4">
                    {balanceLoading ? (
                      <div className="h-16 bg-white/10 rounded-xl animate-pulse w-48" />
                    ) : (
                      <>
                        <span className="text-5xl lg:text-6xl font-bold text-white tracking-tight">
                          {showBalance ? `${(balance?.balance ?? 0).toFixed(2)}` : "••••••"}
                        </span>
                        <span className="text-2xl text-white/90 font-bold">دج</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-white/80 hover:text-white hover:bg-white/15 rounded-2xl h-14 w-14 transition-all hover:scale-110 backdrop-blur-sm border border-white/10"
                  >
                    {showBalance ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-secondary rounded-3xl blur-lg opacity-50"></div>
                    <div className="relative p-5 rounded-3xl bg-gradient-secondary shadow-lg">
                      <Wallet className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Premium Payment Methods Grid */}
        <div className="mb-10 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-2xl font-bold text-white mb-6 text-center">اختر طريقة الدفع</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id as PaymentMethod)}
                className={`relative group p-6 rounded-3xl border-2 transition-all hover:scale-105 ${
                  selectedMethod === method.id
                    ? 'bg-white border-primary shadow-elevated'
                    : 'bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20'
                }`}
              >
                <div className="flex flex-col items-center gap-4">
                  {method.logo ? (
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <div className={`absolute inset-0 rounded-2xl transition-opacity ${
                        selectedMethod === method.id ? 'bg-primary/10 opacity-100' : 'opacity-0 group-hover:opacity-50'
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
                      selectedMethod === method.id 
                        ? 'bg-gradient-primary' 
                        : 'bg-white/10 group-hover:bg-white/20'
                    }`}>
                      <method.icon className={`h-12 w-12 ${
                        selectedMethod === method.id ? 'text-white' : 'text-white/70 group-hover:text-white'
                      }`} />
                    </div>
                  )}
                  <div className="text-center">
                    <p className={`font-bold text-base ${
                      selectedMethod === method.id ? 'text-foreground' : 'text-white'
                    }`}>
                      {method.name}
                    </p>
                    <p className={`text-xs mt-1 ${
                      selectedMethod === method.id ? 'text-muted-foreground' : 'text-white/60'
                    }`}>
                      {method.description}
                    </p>
                  </div>
                </div>
                {selectedMethod === method.id && (
                  <div className="absolute top-3 left-3">
                    <div className="p-1 rounded-full bg-primary">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <Tabs value={selectedMethod} onValueChange={(value) => setSelectedMethod(value as PaymentMethod)} className="space-y-6">


          {/* Deposit Form */}
          <TabsContent value="baridimob" className="space-y-6">
            <Card className="bg-card/95 backdrop-blur-xl border border-border/30 shadow-elevated animate-slide-up overflow-hidden" style={{ animationDelay: '0.3s' }}>
              {/* Premium Header */}
              <div className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-b border-border/30 p-8">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-3xl blur-md opacity-50 bg-gradient-primary"></div>
                    <div className="relative p-4 rounded-3xl bg-white shadow-lg">
                      <img src={baridimobLogo} alt="Baridimob" className="h-12 w-12 object-contain" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">إيداع عبر Baridimob</h2>
                    <p className="text-muted-foreground">أرسل المال إلى المحفظة المحددة أدناه</p>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-8 lg:p-10 space-y-8">
                {/* Wallet Information */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-lg opacity-20"></div>
                  <div className="relative p-8 bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl border-2 border-primary/20">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-2xl bg-gradient-primary">
                        <Wallet className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-bold text-foreground text-xl">محفظة الإيداع</h3>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-white/50 dark:bg-black/20 rounded-2xl">
                      <span className="text-2xl font-bold font-mono text-foreground">
                        {walletsLoading ? "جاري التحميل..." : (wallets?.baridimob || "0551234567")}
                      </span>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => handleCopy(wallets?.baridimob || "0551234567")}
                        className="hover:bg-gradient-primary hover:text-white hover:border-primary/50 transition-all hover:scale-105 rounded-2xl px-8 border-2 font-bold"
                      >
                        {copied ? (
                          <>
                            <Check className="h-5 w-5 ml-2" />
                            تم النسخ
                          </>
                        ) : (
                          <>
                            <Copy className="h-5 w-5 ml-2" />
                            نسخ الرقم
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator className="bg-border/50" />

                {/* Deposit Form */}
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="amount" className="text-foreground font-semibold text-base flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <Banknote className="h-4 w-4 text-primary" />
                        </div>
                        المبلغ المرسل (دج)
                      </Label>
                      <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-primary rounded-xl opacity-0 group-focus-within:opacity-20 blur transition-opacity"></div>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="مثال: 5000"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                          min="1"
                          step="0.01"
                          className="relative bg-background/80 backdrop-blur-sm border-2 border-border/50 hover:border-primary/50 focus:border-primary focus:shadow-lg transition-all h-12 text-base rounded-xl font-medium"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="transactionId" className="text-foreground font-semibold text-base flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <Receipt className="h-4 w-4 text-primary" />
                        </div>
                        معرف المعاملة
                      </Label>
                      <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-primary rounded-xl opacity-0 group-focus-within:opacity-20 blur transition-opacity"></div>
                        <Input
                          id="transactionId"
                          type="text"
                          placeholder="معرف المعاملة من Baridimob"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          required
                          className="relative bg-background/80 backdrop-blur-sm border-2 border-border/50 hover:border-primary/50 focus:border-primary focus:shadow-lg transition-all h-12 text-base rounded-xl font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fee Preview */}
                  {depositAmount > 0 && (
                    <div className="relative p-8 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 rounded-3xl border-2 border-primary/10 shadow-lg">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-md opacity-50"></div>
                          <div className="relative p-3 rounded-2xl bg-gradient-primary shadow-lg">
                            <CheckCircle className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <h3 className="font-bold text-foreground text-xl">ملخص الإيداع</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-background/50 rounded-2xl backdrop-blur-sm">
                          <span className="text-muted-foreground font-semibold text-base">المبلغ المرسل:</span>
                          <span className="font-bold text-foreground text-xl">{formatCurrency(depositAmount)} دج</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-background/50 rounded-2xl backdrop-blur-sm">
                          <span className="text-muted-foreground font-semibold text-base">رسوم الإيداع:</span>
                          <span className="font-bold text-foreground text-xl">{formatCurrency(depositFee.fee_amount)} دج</span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent my-2"></div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-green-500/5 rounded-2xl blur-sm"></div>
                          <div className="relative flex justify-between items-center p-5 bg-green-500/10 rounded-2xl border border-green-500/20">
                            <span className="font-bold text-foreground text-lg">صافي المبلغ المضاف:</span>
                            <span className="font-bold text-green-600 text-2xl">{formatCurrency(netAmount)} دج</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label htmlFor="receipt" className="text-foreground font-semibold text-base flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Upload className="h-4 w-4 text-primary" />
                      </div>
                      صورة الوصل
                    </Label>
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-primary rounded-xl opacity-0 group-focus-within:opacity-20 blur transition-opacity"></div>
                      <Input
                        id="receipt"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        required
                        className="relative cursor-pointer bg-background/80 backdrop-blur-sm border-2 border-border/50 hover:border-primary/50 focus:border-primary focus:shadow-lg transition-all h-12 text-sm rounded-xl"
                      />
                    </div>
                    {receiptFile && (
                      <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20">
                        <p className="text-sm text-green-700 dark:text-green-400 font-medium flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          تم اختيار: {receiptFile.name}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="relative pt-2">
                    <div className="absolute -inset-1 bg-gradient-primary rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                    <Button
                      type="submit"
                      className="relative w-full bg-gradient-primary hover:opacity-90 text-white font-bold py-5 text-lg transition-all hover:scale-[1.02] hover:shadow-elevated rounded-2xl overflow-hidden group"
                      disabled={submitting || loading}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                      {submitting ? (
                        <>
                          <Clock className="h-5 w-5 animate-spin ml-2 relative z-10" />
                          <span className="relative z-10">جاري الإرسال...</span>
                        </>
                      ) : (
                        <>
                          <span className="relative z-10">إرسال طلب الإيداع</span>
                          <ArrowRight className="h-5 w-5 mr-2 relative z-10" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ccp" className="space-y-6">
            <Card className="bg-card/95 backdrop-blur-xl border border-border/30 shadow-elevated animate-slide-up overflow-hidden" style={{ animationDelay: '0.3s' }}>
              <div className="relative bg-gradient-to-br from-secondary/10 via-accent/5 to-transparent border-b border-border/30 p-8">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-3xl blur-md opacity-50 bg-gradient-secondary"></div>
                    <div className="relative p-4 rounded-3xl bg-white shadow-lg">
                      <img src={ccpLogo} alt="CCP" className="h-12 w-12 object-contain" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">إيداع عبر CCP</h2>
                    <p className="text-muted-foreground">قريباً - خدمة CCP قيد التطوير</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-8 lg:p-10">
                <div className="text-center py-16">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-muted/30 rounded-full blur-md"></div>
                    <div className="relative w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center">
                      <Clock className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">قريباً</h3>
                  <p className="text-muted-foreground">هذه الخدمة ستكون متاحة قريباً</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="edahabiya" className="space-y-6">
            <Card className="bg-card/95 backdrop-blur-xl border border-border/30 shadow-elevated animate-slide-up overflow-hidden" style={{ animationDelay: '0.3s' }}>
              <div className="relative bg-gradient-to-br from-accent/10 via-primary/5 to-transparent border-b border-border/30 p-8">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-3xl blur-md opacity-50 bg-gradient-gold"></div>
                    <div className="relative p-4 rounded-3xl bg-white shadow-lg">
                      <img src={edahabiyaLogo} alt="Edahabiya" className="h-12 w-12 object-contain" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">إيداع عبر Edahabiya</h2>
                    <p className="text-muted-foreground">قريباً - خدمة Edahabiya قيد التطوير</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-8 lg:p-10">
                <div className="text-center py-16">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-muted/30 rounded-full blur-md"></div>
                    <div className="relative w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center">
                      <Clock className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">قريباً</h3>
                  <p className="text-muted-foreground">هذه الخدمة ستكون متاحة قريباً</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="albaraka" className="space-y-6">
            <Card className="bg-card/95 backdrop-blur-xl border border-border/30 shadow-elevated animate-slide-up overflow-hidden" style={{ animationDelay: '0.3s' }}>
              <div className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-b border-border/30 p-8">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-3xl blur-md opacity-50 bg-gradient-primary"></div>
                    <div className="relative p-4 rounded-3xl bg-white shadow-lg">
                      <img src={albarakaLogo} alt="بنك البركة" className="h-12 w-12 object-contain" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">إيداع عبر بنك البركة</h2>
                    <p className="text-muted-foreground">قريباً - خدمة بنك البركة قيد التطوير</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-8 lg:p-10">
                <div className="text-center py-16">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-muted/30 rounded-full blur-md"></div>
                    <div className="relative w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center">
                      <Clock className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">قريباً</h3>
                  <p className="text-muted-foreground">هذه الخدمة ستكون متاحة قريباً</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="badr" className="space-y-6">
            <Card className="bg-card/95 backdrop-blur-xl border border-border/30 shadow-elevated animate-slide-up overflow-hidden" style={{ animationDelay: '0.3s' }}>
              <div className="relative bg-gradient-to-br from-secondary/10 via-accent/5 to-transparent border-b border-border/30 p-8">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-3xl blur-md opacity-50 bg-gradient-secondary"></div>
                    <div className="relative p-4 rounded-3xl bg-white shadow-lg">
                      <img src={badrLogo} alt="بنك البدر" className="h-12 w-12 object-contain" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">إيداع عبر بنك البدر</h2>
                    <p className="text-muted-foreground">قريباً - خدمة بنك البدر قيد التطوير</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-8 lg:p-10">
                <div className="text-center py-16">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-muted/30 rounded-full blur-md"></div>
                    <div className="relative w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center">
                      <Clock className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">قريباً</h3>
                  <p className="text-muted-foreground">هذه الخدمة ستكون متاحة قريباً</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="atm" className="space-y-6">
            <Card className="bg-card/95 backdrop-blur-xl border border-border/30 shadow-elevated animate-slide-up overflow-hidden" style={{ animationDelay: '0.3s' }}>
              <div className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-b border-border/30 p-8">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-md opacity-50"></div>
                    <div className="relative p-4 rounded-3xl bg-gradient-primary shadow-lg">
                      <Building2 className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">إيداع عبر الصراف الآلي</h2>
                    <p className="text-muted-foreground">قم بالإيداع عبر الصراف الآلي ثم املأ النموذج</p>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-8 lg:p-10 space-y-8">
                {/* ATM Instructions */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-lg opacity-20"></div>
                  <div className="relative p-8 bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl border-2 border-primary/20">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 rounded-2xl bg-gradient-primary">
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-bold text-foreground text-xl">تعليمات الإيداع</h3>
                    </div>
                    <ul className="space-y-3">
                      {[
                        'توجه إلى أقرب صراف آلي',
                        'قم بإيداع المبلغ في الحساب المحدد',
                        'احتفظ بإيصال الإيداع',
                        'املأ النموذج أدناه وأرفق صورة الإيصال'
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-muted-foreground">
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2"></div>
                          <span className="text-base font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Separator className="bg-border/50" />

                {/* Same form structure as Baridimob but adjusted for ATM */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="amount" className="text-foreground font-semibold text-base flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <Banknote className="h-4 w-4 text-primary" />
                        </div>
                        المبلغ المودع (دج)
                      </Label>
                      <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-primary rounded-xl opacity-0 group-focus-within:opacity-20 blur transition-opacity"></div>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="مثال: 5000"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                          min="1"
                          step="0.01"
                          className="relative bg-background/80 backdrop-blur-sm border-2 border-border/50 hover:border-primary/50 focus:border-primary focus:shadow-lg transition-all h-12 text-base rounded-xl font-medium"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="transactionId" className="text-foreground font-semibold text-base flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <Receipt className="h-4 w-4 text-primary" />
                        </div>
                        رقم الإيصال
                      </Label>
                      <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-primary rounded-xl opacity-0 group-focus-within:opacity-20 blur transition-opacity"></div>
                        <Input
                          id="transactionId"
                          type="text"
                          placeholder="رقم إيصال الصراف الآلي"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          required
                          className="relative bg-background/80 backdrop-blur-sm border-2 border-border/50 hover:border-primary/50 focus:border-primary focus:shadow-lg transition-all h-12 text-base rounded-xl font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {depositAmount > 0 && (
                    <div className="relative p-8 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 rounded-3xl border-2 border-primary/10 shadow-lg">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-md opacity-50"></div>
                          <div className="relative p-3 rounded-2xl bg-gradient-primary shadow-lg">
                            <CheckCircle className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <h3 className="font-bold text-foreground text-xl">ملخص الإيداع</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-background/50 rounded-2xl backdrop-blur-sm">
                          <span className="text-muted-foreground font-semibold text-base">المبلغ المودع:</span>
                          <span className="font-bold text-foreground text-xl">{formatCurrency(depositAmount)} دج</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-background/50 rounded-2xl backdrop-blur-sm">
                          <span className="text-muted-foreground font-semibold text-base">رسوم الإيداع:</span>
                          <span className="font-bold text-foreground text-xl">{formatCurrency(depositFee.fee_amount)} دج</span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent my-2"></div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-green-500/5 rounded-2xl blur-sm"></div>
                          <div className="relative flex justify-between items-center p-5 bg-green-500/10 rounded-2xl border border-green-500/20">
                            <span className="font-bold text-foreground text-lg">صافي المبلغ المضاف:</span>
                            <span className="font-bold text-green-600 text-2xl">{formatCurrency(netAmount)} دج</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label htmlFor="receipt" className="text-foreground font-semibold text-base flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Upload className="h-4 w-4 text-primary" />
                      </div>
                      صورة الإيصال
                    </Label>
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-primary rounded-xl opacity-0 group-focus-within:opacity-20 blur transition-opacity"></div>
                      <Input
                        id="receipt"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        required
                        className="relative cursor-pointer bg-background/80 backdrop-blur-sm border-2 border-border/50 hover:border-primary/50 focus:border-primary focus:shadow-lg transition-all h-12 text-sm rounded-xl"
                      />
                    </div>
                    {receiptFile && (
                      <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20">
                        <p className="text-sm text-green-700 dark:text-green-400 font-medium flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          تم اختيار: {receiptFile.name}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="relative pt-2">
                    <div className="absolute -inset-1 bg-gradient-primary rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                    <Button
                      type="submit"
                      className="relative w-full bg-gradient-primary hover:opacity-90 text-white font-bold py-5 text-lg transition-all hover:scale-[1.02] hover:shadow-elevated rounded-2xl overflow-hidden group"
                      disabled={submitting || loading}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                      {submitting ? (
                        <>
                          <Clock className="h-5 w-5 animate-spin ml-2 relative z-10" />
                          <span className="relative z-10">جاري الإرسال...</span>
                        </>
                      ) : (
                        <>
                          <span className="relative z-10">إرسال طلب الإيداع</span>
                          <ArrowRight className="h-5 w-5 mr-2 relative z-10" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cash" className="space-y-6">
            <Card className="bg-card/95 backdrop-blur-xl border border-border/30 shadow-elevated animate-slide-up overflow-hidden" style={{ animationDelay: '0.3s' }}>
              <div className="relative bg-gradient-to-br from-secondary/10 via-accent/5 to-transparent border-b border-border/30 p-8">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-secondary rounded-3xl blur-md opacity-50"></div>
                    <div className="relative p-4 rounded-3xl bg-gradient-secondary shadow-lg">
                      <HandCoins className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">إيداع نقدي (كاش)</h2>
                    <p className="text-muted-foreground">اتصل بنا لمعرفة أقرب نقطة إيداع</p>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-8 lg:p-10">
                {/* Contact Information */}
                <div className="space-y-8">
                  {/* Main Call to Action */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-gold rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
                    <div className="relative p-10 bg-gradient-to-br from-accent/15 to-accent/5 rounded-3xl border-2 border-accent/30 text-center">
                      <div className="flex justify-center mb-6">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-gold rounded-full blur-lg opacity-50 animate-pulse"></div>
                          <div className="relative p-6 rounded-full bg-gradient-gold shadow-lg">
                            <Phone className="h-12 w-12 text-white" />
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="text-3xl font-bold text-foreground mb-4">للإيداع النقدي</h3>
                      <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
                        اتصل بنا الآن وسنرشدك إلى أقرب نقطة إيداع نقدي لشحن حسابك بسهولة
                      </p>
                      
                      {/* Phone Number Display */}
                      <div className="relative inline-block">
                        <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-md opacity-30"></div>
                        <div className="relative bg-white dark:bg-card rounded-2xl p-6 shadow-lg border-2 border-primary/20">
                          <p className="text-sm text-muted-foreground mb-2 font-medium">رقم الاتصال</p>
                          <a 
                            href="tel:0553980661"
                            className="text-4xl lg:text-5xl font-bold text-primary hover:text-primary/80 transition-colors font-mono tracking-wide block"
                            dir="ltr"
                          >
                            0553 980 661
                          </a>
                        </div>
                      </div>

                      {/* Call & WhatsApp Buttons */}
                      <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                        <a 
                          href="tel:0553980661"
                          className="relative inline-block"
                        >
                          <div className="absolute -inset-1 bg-gradient-gold rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                          <Button
                            size="lg"
                            className="relative bg-gradient-gold hover:opacity-90 text-white font-bold py-6 px-12 text-xl transition-all hover:scale-[1.02] hover:shadow-elevated rounded-2xl"
                          >
                            <Phone className="h-6 w-6 ml-2" />
                            اتصل الآن
                          </Button>
                        </a>
                        
                        <a 
                          href="https://wa.me/213553980661?text=مرحباً، أريد الاستفسار عن الإيداع النقدي"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative inline-block"
                        >
                          <div className="absolute -inset-1 bg-green-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                          <Button
                            size="lg"
                            className="relative bg-green-500 hover:bg-green-600 text-white font-bold py-6 px-12 text-xl transition-all hover:scale-[1.02] hover:shadow-elevated rounded-2xl"
                          >
                            <MessageCircle className="h-6 w-6 ml-2" />
                            واتساب
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-secondary rounded-3xl blur-lg opacity-10"></div>
                    <div className="relative p-8 bg-gradient-to-br from-secondary/5 to-accent/5 rounded-3xl border border-border/30">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-2xl bg-gradient-secondary">
                          <CheckCircle className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="font-bold text-foreground text-xl">خطوات الإيداع النقدي</h3>
                      </div>
                      <ul className="space-y-4">
                        {[
                          { step: '1', text: 'اتصل بالرقم أعلاه للتواصل مع فريق الدعم' },
                          { step: '2', text: 'سنرشدك إلى أقرب نقطة إيداع نقدي معتمدة' },
                          { step: '3', text: 'توجه إلى الموقع وقم بإيداع المبلغ المطلوب' },
                          { step: '4', text: 'ستتم إضافة المبلغ إلى حسابك فوراً بعد التأكيد' }
                        ].map((item, i) => (
                          <li key={i} className="flex items-start gap-4 text-muted-foreground group hover:text-foreground transition-colors">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary group-hover:bg-primary group-hover:text-white transition-all">
                              {item.step}
                            </div>
                            <span className="text-base font-medium pt-2">{item.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="relative p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border border-primary/10">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground mb-2">ملاحظة هامة</h4>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          الإيداع النقدي متاح في نقاط معتمدة فقط. اتصل بنا لمعرفة أقرب موقع إليك. جميع العمليات آمنة ومضمونة بنسبة 100%.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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