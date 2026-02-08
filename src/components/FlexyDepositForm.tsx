import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useFlexyDeposit } from '@/hooks/useFlexyDeposit';
import { useBalance } from '@/hooks/useBalance';
import {
  Smartphone,
  Banknote,
  CheckCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  Copy,
  Check,
  Zap,
  Camera,
  Image as ImageIcon,
  X,
  RefreshCw,
  Hash,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import mobilisLogo from '@/assets/mobilis-logo.png';

interface FlexyDepositFormProps {
  onSuccess?: () => void;
}

const FlexyDepositForm: React.FC<FlexyDepositFormProps> = ({ onSuccess }) => {
  const { settings, loading, submitting, todayCount, calculateFlexyFee, createFlexyDeposit, getAvailableUniqueAmount } = useFlexyDeposit();
  const { fetchBalance } = useBalance();
  const { toast } = useToast();

  const [senderPhone, setSenderPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [uniqueAmount, setUniqueAmount] = useState<number | null>(null);
  const [generatingAmount, setGeneratingAmount] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const numericAmount = parseFloat(amount) || 0;
  const isOverLimit = todayCount >= settings.daily_limit;

  // Fee is calculated on the FULL unique amount (what user actually sends)
  const { fee: uniqueFee, net: uniqueNet } = calculateFlexyFee(uniqueAmount || 0);

  // Generate unique amount when base amount changes and is valid
  useEffect(() => {
    if (numericAmount >= settings.min_amount && numericAmount <= settings.max_amount) {
      generateNewUniqueAmount(numericAmount);
    } else {
      setUniqueAmount(null);
    }
  }, [numericAmount, settings.min_amount, settings.max_amount]);

  const generateNewUniqueAmount = async (baseAmount: number) => {
    setGeneratingAmount(true);
    try {
      const unique = await getAvailableUniqueAmount(baseAmount);
      setUniqueAmount(unique);
    } catch {
      // Fallback: simple random
      setUniqueAmount(baseAmount + Math.floor(Math.random() * 99) + 1);
    } finally {
      setGeneratingAmount(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, '');
    setSenderPhone(cleaned);
    if (phoneError) setPhoneError('');
    if (cleaned.length > 0 && cleaned.length >= 2 && !cleaned.startsWith('06')) {
      setPhoneError('رقم موبيليس يجب أن يبدأ بـ 06');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'حجم الملف كبير',
        description: 'الحد الأقصى لحجم الصورة هو 5 ميجابايت',
        variant: 'destructive',
      });
      return;
    }

    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uniqueAmount) {
      toast({
        title: 'خطأ',
        description: 'يرجى الانتظار حتى يتم توليد المبلغ الفريد',
        variant: 'destructive',
      });
      return;
    }

    if (!receiptFile) {
      toast({
        title: 'صورة مطلوبة',
        description: 'يرجى رفع صورة رسالة تأكيد الإرسال',
        variant: 'destructive',
      });
      return;
    }

    const result = await createFlexyDeposit(senderPhone, numericAmount, uniqueAmount, receiptFile);
    if (result.success) {
      setSenderPhone('');
      setAmount('');
      setUniqueAmount(null);
      removeFile();
      fetchBalance();
      onSuccess?.();
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/95 backdrop-blur-xl border border-border/30 shadow-elevated animate-slide-up overflow-hidden">
        <CardContent className="p-8">
          <div className="flex items-center justify-center py-12">
            <Clock className="w-8 h-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!settings.enabled) {
    return (
      <Card className="bg-card/95 backdrop-blur-xl border border-border/30 shadow-elevated animate-slide-up overflow-hidden">
        <CardContent className="p-8 text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">خدمة الفليكسي متوقفة مؤقتاً</h2>
          <p className="text-muted-foreground">
            خدمة إيداع الفليكسي غير متاحة حالياً. يرجى المحاولة لاحقاً.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!settings.receiving_number) {
    return (
      <Card className="bg-card/95 backdrop-blur-xl border border-border/30 shadow-elevated animate-slide-up overflow-hidden">
        <CardContent className="p-8 text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">الخدمة غير مهيأة</h2>
          <p className="text-muted-foreground">
            لم يتم تحديد رقم استقبال الفليكسي بعد. تواصل مع الإدارة.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/95 backdrop-blur-xl border border-border/30 shadow-elevated animate-slide-up overflow-hidden">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-green-500/10 via-green-400/5 to-transparent border-b border-border/30 p-8">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl blur-md opacity-50 bg-green-500"></div>
            <div className="relative p-4 rounded-3xl bg-white shadow-lg">
              <img src={mobilisLogo} alt="Mobilis" className="h-12 w-12 object-contain" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">إيداع عبر فليكسي موبيليس</h2>
            <p className="text-muted-foreground">أرسل فليكسي بالمبلغ الفريد إلى الرقم أدناه</p>
          </div>
        </div>
      </div>

      <CardContent className="p-8 lg:p-10 space-y-8">
        {/* Receiving Number */}
        <div className="relative">
          <div className="absolute inset-0 bg-green-500 rounded-3xl blur-lg opacity-10"></div>
          <div className="relative p-8 bg-gradient-to-br from-green-500/10 to-green-400/5 rounded-3xl border-2 border-green-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-green-500">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-foreground text-xl">رقم استقبال الفليكسي</h3>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-white/50 dark:bg-black/20 rounded-2xl">
              <span className="text-3xl font-bold font-mono text-foreground" dir="ltr">
                {settings.receiving_number}
              </span>
              <CopyButton text={settings.receiving_number} />
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="relative p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border border-border/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-bold text-foreground text-lg">خطوات الإيداع</h3>
          </div>
          <ol className="space-y-3">
            {[
              'أدخل المبلغ المطلوب وسيُنشئ النظام مبلغاً فريداً لك',
              'أرسل فليكسي بالمبلغ الفريد بالضبط إلى الرقم أعلاه',
              'أدخل رقم هاتفك وارفع صورة رسالة تأكيد الإرسال',
              'أكد الطلب وانتظر الموافقة',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-muted-foreground">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                  {i + 1}
                </span>
                <span className="text-sm font-medium pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <Separator className="bg-border/50" />

        {/* Daily limit warning */}
        {isOverLimit && (
          <div className="p-4 bg-destructive/10 rounded-2xl border border-destructive/20 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive font-medium">
              لقد وصلت إلى الحد الأقصى اليومي ({settings.daily_limit} طلبات). حاول غداً.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Input */}
          <div className="space-y-3">
            <Label htmlFor="flexyAmount" className="text-foreground font-semibold text-base flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/10">
                <Banknote className="h-4 w-4 text-green-600" />
              </div>
              المبلغ المطلوب إيداعه (د.ج)
            </Label>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-green-500 rounded-xl opacity-0 group-focus-within:opacity-20 blur transition-opacity"></div>
              <Input
                id="flexyAmount"
                type="number"
                placeholder={`${settings.min_amount} - ${settings.max_amount}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={settings.min_amount}
                max={settings.max_amount}
                required
                disabled={isOverLimit}
                className="relative bg-background/80 backdrop-blur-sm border-2 border-border/50 hover:border-green-500/50 focus:border-green-500 transition-all h-12 text-base rounded-xl font-medium"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              الحد: {settings.min_amount} - {settings.max_amount} د.ج
            </p>
          </div>

          {/* Unique Amount Display - PROMINENT */}
          {uniqueAmount && numericAmount >= settings.min_amount && numericAmount <= settings.max_amount && (
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500 rounded-3xl blur-xl opacity-20"></div>
              <div className="relative p-8 bg-gradient-to-br from-amber-500/15 to-orange-400/10 rounded-3xl border-2 border-amber-500/40 shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-amber-500 shadow-lg">
                      <Hash className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-xl">⚡ المبلغ المطلوب إرساله</h3>
                      <p className="text-sm text-muted-foreground">أرسل هذا المبلغ بالضبط كفليكسي</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => generateNewUniqueAmount(numericAmount)}
                    disabled={generatingAmount}
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                    title="توليد مبلغ فريد جديد"
                  >
                    <RefreshCw className={`h-4 w-4 ${generatingAmount ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <div className="flex flex-col items-center gap-4 p-8 bg-white/70 dark:bg-black/40 rounded-2xl border-2 border-amber-500/30 shadow-inner">
                  {generatingAmount ? (
                    <div className="flex items-center gap-2 py-4">
                      <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
                      <span className="text-muted-foreground text-lg">جاري التوليد...</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-5xl font-black font-mono text-amber-600" dir="ltr">
                        {uniqueAmount}
                      </span>
                      <span className="text-xl font-bold text-amber-500">دينار جزائري</span>
                    </>
                  )}
                  {!generatingAmount && (
                    <div className="w-full flex justify-center">
                      <CopyButton text={uniqueAmount.toString()} />
                    </div>
                  )}
                </div>
                <div className="mt-5 p-4 bg-green-500/10 rounded-xl border border-green-500/20 flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-700 dark:text-green-400 font-medium space-y-1">
                    <p>✅ أرسل <strong>{uniqueAmount} د.ج</strong> فليكسي بالضبط إلى الرقم أعلاه</p>
                    <p>✅ المبلغ الكامل ({uniqueAmount} د.ج) يُحسب لصالحك بعد خصم الرسوم</p>
                    <p>✅ هذا المبلغ الفريد يضمن التحقق السريع من إيداعك</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Phone Input */}
          <div className="space-y-3">
            <Label htmlFor="senderPhone" className="text-foreground font-semibold text-base flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/10">
                <Smartphone className="h-4 w-4 text-green-600" />
              </div>
              رقم الهاتف المُرسل منه
            </Label>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-green-500 rounded-xl opacity-0 group-focus-within:opacity-20 blur transition-opacity"></div>
              <Input
                id="senderPhone"
                type="tel"
                placeholder="06xxxxxxxx"
                value={senderPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                maxLength={10}
                dir="ltr"
                required
                disabled={isOverLimit}
                className={`relative bg-background/80 backdrop-blur-sm border-2 transition-all h-12 text-base rounded-xl font-medium text-left ${
                  phoneError
                    ? 'border-destructive'
                    : 'border-border/50 hover:border-green-500/50 focus:border-green-500'
                }`}
              />
            </div>
            {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
            {!phoneError && senderPhone.length === 10 && senderPhone.startsWith('06') && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> رقم موبيليس صحيح
              </p>
            )}
          </div>

          {/* Receipt Image Upload */}
          <div className="space-y-3">
            <Label className="text-foreground font-semibold text-base flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/10">
                <Camera className="h-4 w-4 text-green-600" />
              </div>
              صورة رسالة تأكيد الإرسال
            </Label>
            <p className="text-xs text-muted-foreground">
              ارفع لقطة شاشة لرسالة التأكيد التي ظهرت بعد إرسال الفليكسي
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={isOverLimit}
            />

            {!receiptFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isOverLimit}
                className="w-full p-8 border-2 border-dashed border-border/50 hover:border-green-500/50 rounded-2xl transition-all hover:bg-green-500/5 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex flex-col items-center gap-3 text-muted-foreground group-hover:text-green-600 transition-colors">
                  <div className="p-4 rounded-2xl bg-muted group-hover:bg-green-500/10 transition-colors">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-base">اضغط لرفع صورة التأكيد</p>
                    <p className="text-xs mt-1">PNG, JPG — الحد الأقصى 5 ميجابايت</p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="relative rounded-2xl border-2 border-green-500/30 overflow-hidden bg-green-500/5">
                <img
                  src={receiptPreview || ''}
                  alt="صورة التأكيد"
                  className="w-full max-h-64 object-contain p-2"
                />
                <button
                  type="button"
                  onClick={removeFile}
                  className="absolute top-3 left-3 p-2 rounded-full bg-destructive text-white hover:bg-destructive/90 shadow-lg transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="p-3 bg-green-500/10 border-t border-green-500/20 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                    تم تحميل الصورة بنجاح
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Fee Preview */}
          {uniqueAmount && numericAmount >= settings.min_amount && numericAmount <= settings.max_amount && (
            <div className="relative p-8 bg-gradient-to-br from-green-500/5 via-green-400/5 to-transparent rounded-3xl border-2 border-green-500/10 shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500 rounded-2xl blur-md opacity-50"></div>
                  <div className="relative p-3 rounded-2xl bg-green-500 shadow-lg">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="font-bold text-foreground text-xl">ملخص الإيداع</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                  <span className="text-amber-700 dark:text-amber-400 font-semibold text-base">المبلغ الفريد المُرسل:</span>
                  <span className="font-bold text-amber-600 text-xl">{uniqueAmount} د.ج</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-background/50 rounded-2xl backdrop-blur-sm">
                  <span className="text-muted-foreground font-semibold text-base">
                    الرسوم ({settings.fee_percentage}%) على المبلغ الكامل:
                  </span>
                  <span className="font-bold text-orange-600 text-xl">-{uniqueFee} د.ج</span>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent my-2"></div>
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/5 rounded-2xl blur-sm"></div>
                  <div className="relative flex justify-between items-center p-5 bg-green-500/10 rounded-2xl border border-green-500/20">
                    <span className="font-bold text-foreground text-lg">صافي المبلغ المُضاف لرصيدك:</span>
                    <span className="font-bold text-green-600 text-2xl">{uniqueNet} د.ج</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Today's count */}
          <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 p-3 rounded-xl">
            <span>الطلبات اليوم:</span>
            <span className={todayCount >= settings.daily_limit ? 'text-destructive font-bold' : ''}>
              {todayCount} / {settings.daily_limit}
            </span>
          </div>

          <div className="relative pt-2">
            <div className="absolute -inset-1 bg-green-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <Button
              type="submit"
              className="relative w-full bg-green-500 hover:bg-green-600 text-white font-bold py-5 text-lg transition-all hover:scale-[1.02] hover:shadow-elevated rounded-2xl overflow-hidden group"
              disabled={
                submitting ||
                isOverLimit ||
                !senderPhone ||
                senderPhone.length !== 10 ||
                !amount ||
                numericAmount < settings.min_amount ||
                numericAmount > settings.max_amount ||
                !!phoneError ||
                !uniqueAmount ||
                generatingAmount ||
                !receiptFile
              }
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              {submitting ? (
                <>
                  <Clock className="h-5 w-5 animate-spin ml-2 relative z-10" />
                  <span className="relative z-10">جاري الإرسال...</span>
                </>
              ) : (
                <>
                  <span className="relative z-10">تأكيد إرسال الفليكسي</span>
                  <ArrowRight className="h-5 w-5 mr-2 relative z-10" />
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Internal CopyButton component
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: 'تم النسخ', description: 'تم نسخ الرقم بنجاح' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={handleCopy}
      className="hover:bg-green-500 hover:text-white hover:border-green-500/50 transition-all hover:scale-105 rounded-2xl px-8 border-2 font-bold"
    >
      {copied ? (
        <>
          <Check className="h-5 w-5 ml-2" />
          تم النسخ
        </>
      ) : (
        <>
          <Copy className="h-5 w-5 ml-2" />
          نسخ
        </>
      )}
    </Button>
  );
};

export default FlexyDepositForm;
