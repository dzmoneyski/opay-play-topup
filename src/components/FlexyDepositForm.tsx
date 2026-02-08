import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFlexyDeposit } from '@/hooks/useFlexyDeposit';
import { useBalance } from '@/hooks/useBalance';
import {
  Smartphone,
  Banknote,
  CheckCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Copy,
  Check,
  Camera,
  Image as ImageIcon,
  X,
  RefreshCw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import mobilisLogo from '@/assets/mobilis-logo.png';

interface FlexyDepositFormProps {
  onSuccess?: () => void;
}

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const FlexyDepositForm: React.FC<FlexyDepositFormProps> = ({ onSuccess }) => {
  const { settings, loading, submitting, todayCount, calculateFlexyFee, createFlexyDeposit, getAvailableUniqueAmount } = useFlexyDeposit();
  const { fetchBalance } = useBalance();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
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
  const { fee: uniqueFee, net: uniqueNet } = calculateFlexyFee(uniqueAmount || 0);

  const isAmountValid = numericAmount >= settings.min_amount && numericAmount <= settings.max_amount;
  const isPhoneValid = senderPhone.length === 10 && senderPhone.startsWith('06');

  // Generate unique amount when base amount changes and is valid
  useEffect(() => {
    if (isAmountValid) {
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
      setUniqueAmount(baseAmount + Math.floor(Math.random() * 5) + 1);
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
      toast({ title: 'حجم الملف كبير', description: 'الحد الأقصى 5 ميجابايت', variant: 'destructive' });
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

  const handleSubmit = async () => {
    if (!uniqueAmount || !receiptFile) return;
    const result = await createFlexyDeposit(senderPhone, numericAmount, uniqueAmount, receiptFile);
    if (result.success) {
      setSenderPhone('');
      setAmount('');
      setUniqueAmount(null);
      removeFile();
      setStep(1);
      fetchBalance();
      onSuccess?.();
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border border-border/30 shadow-sm animate-slide-up">
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
      <Card className="bg-card border border-border/30 shadow-sm animate-slide-up">
        <CardContent className="p-8 text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">خدمة الفليكسي متوقفة مؤقتاً</h2>
          <p className="text-muted-foreground">خدمة إيداع الفليكسي غير متاحة حالياً. يرجى المحاولة لاحقاً.</p>
        </CardContent>
      </Card>
    );
  }

  if (!settings.receiving_number) {
    return (
      <Card className="bg-card border border-border/30 shadow-sm animate-slide-up">
        <CardContent className="p-8 text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">الخدمة غير مهيأة</h2>
          <p className="text-muted-foreground">لم يتم تحديد رقم استقبال الفليكسي بعد. تواصل مع الإدارة.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border border-border/30 shadow-sm animate-slide-up overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-l from-[hsl(var(--success)/0.08)] to-transparent border-b border-border/30 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-white shadow-sm border border-border/30">
            <img src={mobilisLogo} alt="Mobilis" className="h-10 w-10 object-contain" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">إيداع فليكسي موبيليس</h2>
            <p className="text-sm text-muted-foreground">
              {todayCount}/{settings.daily_limit} طلبات اليوم
            </p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="px-6 py-4 border-b border-border/20 bg-muted/30">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {[
            { num: 1, label: 'المبلغ' },
            { num: 2, label: 'الإرسال' },
            { num: 3, label: 'التأكيد' },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <button
                type="button"
                onClick={() => {
                  if (s.num < step) setStep(s.num);
                }}
                className="flex flex-col items-center gap-1.5 group"
                disabled={s.num > step}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step === s.num
                      ? 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] shadow-md'
                      : step > s.num
                      ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > s.num ? <Check className="h-4 w-4" /> : s.num}
                </div>
                <span className={`text-xs font-medium ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </button>
              {i < 2 && (
                <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all ${step > s.num ? 'bg-[hsl(var(--success))]' : 'bg-border'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Daily limit warning */}
      {isOverLimit && (
        <div className="mx-6 mt-4 p-3 bg-destructive/10 rounded-xl border border-destructive/20 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive font-medium">
            وصلت للحد الأقصى ({settings.daily_limit} طلبات يومياً). حاول غداً.
          </p>
        </div>
      )}

      <CardContent className="p-6">
        {/* ===== STEP 1: Amount ===== */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="space-y-2">
              <Label className="text-foreground font-semibold flex items-center gap-2">
                <Banknote className="h-4 w-4 text-[hsl(var(--success))]" />
                حدد المبلغ الذي تريد إيداعه
              </Label>
              <p className="text-xs text-muted-foreground">
                {settings.min_amount} - {settings.max_amount} د.ج
              </p>
            </div>

            {/* Quick amount buttons */}
            <div className="grid grid-cols-3 gap-2">
              {QUICK_AMOUNTS.filter(a => a >= settings.min_amount && a <= settings.max_amount).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(a.toString())}
                  disabled={isOverLimit}
                  className={`p-3 rounded-xl text-sm font-bold transition-all border-2 ${
                    numericAmount === a
                      ? 'border-[hsl(var(--success))] bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                      : 'border-border/50 bg-background hover:border-[hsl(var(--success)/0.5)] text-foreground'
                  } disabled:opacity-50`}
                >
                  {a.toLocaleString()} د.ج
                </button>
              ))}
            </div>

            {/* Custom amount input */}
            <div className="relative">
              <Input
                type="number"
                placeholder="أو أدخل مبلغ مخصص..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={settings.min_amount}
                max={settings.max_amount}
                disabled={isOverLimit}
                className="h-12 text-base rounded-xl border-2 border-border/50 focus:border-[hsl(var(--success))] pr-4 pl-16 font-medium"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                د.ج
              </span>
            </div>

            {/* Fee preview */}
            {isAmountValid && uniqueAmount && (
              <div className="p-4 bg-muted/50 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ستُرسل فليكسي بقيمة:</span>
                  <span className="font-bold text-foreground">{uniqueAmount} د.ج</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الرسوم ({settings.fee_percentage}%):</span>
                  <span className="font-medium text-orange-600">-{uniqueFee} د.ج</span>
                </div>
                <div className="h-px bg-border/50 my-1" />
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">يُضاف لرصيدك:</span>
                  <span className="font-bold text-[hsl(var(--success))] text-base">{uniqueNet} د.ج</span>
                </div>
              </div>
            )}

            <Button
              type="button"
              onClick={() => setStep(2)}
              disabled={!isAmountValid || isOverLimit || !uniqueAmount || generatingAmount}
              className="w-full h-12 text-base font-bold rounded-xl bg-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.9)] text-[hsl(var(--success-foreground))]"
            >
              {generatingAmount ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                  جاري التحضير...
                </>
              ) : (
                <>
                  التالي
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* ===== STEP 2: Send Flexy ===== */}
        {step === 2 && uniqueAmount && (
          <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Unique amount - hero */}
            <div className="text-center space-y-3">
              <p className="text-sm font-medium text-muted-foreground">أرسل فليكسي بهذا المبلغ بالضبط</p>
              <div className="py-5 px-6 bg-gradient-to-br from-[hsl(var(--success)/0.08)] to-[hsl(var(--success)/0.03)] rounded-2xl border-2 border-[hsl(var(--success)/0.3)]">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-5xl font-black text-[hsl(var(--success))] font-mono tracking-tight" dir="ltr">
                    {uniqueAmount}
                  </span>
                  <span className="text-lg font-bold text-[hsl(var(--success)/0.7)]">د.ج</span>
                </div>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <CopyButton text={uniqueAmount.toString()} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => generateNewUniqueAmount(numericAmount)}
                    disabled={generatingAmount}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className={`h-4 w-4 ${generatingAmount ? 'animate-spin' : ''}`} />
                    <span className="mr-1 text-xs">تغيير</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Target number */}
            <div className="p-4 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground mb-2 text-center">إلى الرقم</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold font-mono text-foreground" dir="ltr">
                  {settings.receiving_number}
                </span>
                <CopyButton text={settings.receiving_number} compact />
              </div>
            </div>

            {/* Important note */}
            <div className="p-3 bg-[hsl(var(--warning)/0.08)] rounded-xl border border-[hsl(var(--warning)/0.2)] flex items-start gap-2.5">
              <ShieldCheck className="h-5 w-5 text-[hsl(var(--warning))] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-foreground leading-relaxed">
                <strong>مهم:</strong> أرسل المبلغ <strong>{uniqueAmount} د.ج</strong> بالضبط. المبلغ الكامل يُحسب لصالحك بعد خصم الرسوم ({settings.fee_percentage}%).
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 h-12 rounded-xl font-bold"
              >
                <ArrowRight className="h-4 w-4 ml-2" />
                رجوع
              </Button>
              <Button
                type="button"
                onClick={() => setStep(3)}
                className="flex-[2] h-12 rounded-xl font-bold bg-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.9)] text-[hsl(var(--success-foreground))]"
              >
                <Send className="h-4 w-4 ml-2" />
                أرسلت الفليكسي
              </Button>
            </div>
          </div>
        )}

        {/* ===== STEP 3: Confirm ===== */}
        {step === 3 && uniqueAmount && (
          <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="senderPhone" className="text-foreground font-semibold flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-[hsl(var(--success))]" />
                رقم الهاتف المُرسل منه
              </Label>
              <Input
                id="senderPhone"
                type="tel"
                placeholder="06xxxxxxxx"
                value={senderPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                maxLength={10}
                dir="ltr"
                className={`h-12 text-base rounded-xl border-2 font-medium text-left ${
                  phoneError
                    ? 'border-destructive'
                    : isPhoneValid
                    ? 'border-[hsl(var(--success))]'
                    : 'border-border/50 focus:border-[hsl(var(--success))]'
                }`}
              />
              {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
              {isPhoneValid && !phoneError && (
                <p className="text-xs text-[hsl(var(--success))] flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> رقم صحيح
                </p>
              )}
            </div>

            {/* Receipt Upload */}
            <div className="space-y-2">
              <Label className="text-foreground font-semibold flex items-center gap-2">
                <Camera className="h-4 w-4 text-[hsl(var(--success))]" />
                صورة تأكيد الإرسال
              </Label>
              <p className="text-xs text-muted-foreground">لقطة شاشة لرسالة التأكيد بعد إرسال الفليكسي</p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {!receiptFile ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-6 border-2 border-dashed border-border/50 hover:border-[hsl(var(--success)/0.5)] rounded-xl transition-all hover:bg-[hsl(var(--success)/0.03)] group"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-[hsl(var(--success))]">
                    <ImageIcon className="h-8 w-8" />
                    <p className="font-semibold text-sm">اضغط لرفع الصورة</p>
                    <p className="text-xs">PNG, JPG — حد أقصى 5MB</p>
                  </div>
                </button>
              ) : (
                <div className="relative rounded-xl border-2 border-[hsl(var(--success)/0.3)] overflow-hidden">
                  <img
                    src={receiptPreview || ''}
                    alt="صورة التأكيد"
                    className="w-full max-h-48 object-contain p-2 bg-muted/30"
                  />
                  <button
                    type="button"
                    onClick={removeFile}
                    className="absolute top-2 left-2 p-1.5 rounded-full bg-destructive text-white shadow-md"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="p-2.5 bg-[hsl(var(--success)/0.08)] border-t border-[hsl(var(--success)/0.2)] flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
                    <span className="text-xs text-[hsl(var(--success))] font-medium">تم التحميل</span>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="p-4 bg-muted/40 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المبلغ المُرسل:</span>
                <span className="font-bold">{uniqueAmount} د.ج</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الرسوم ({settings.fee_percentage}%):</span>
                <span className="text-orange-600">-{uniqueFee} د.ج</span>
              </div>
              <div className="h-px bg-border/50" />
              <div className="flex justify-between">
                <span className="font-semibold">يُضاف للرصيد:</span>
                <span className="font-bold text-[hsl(var(--success))]">{uniqueNet} د.ج</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-1 h-12 rounded-xl font-bold"
              >
                <ArrowRight className="h-4 w-4 ml-2" />
                رجوع
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !isPhoneValid || !!phoneError || !receiptFile}
                className="flex-[2] h-12 rounded-xl font-bold bg-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.9)] text-[hsl(var(--success-foreground))]"
              >
                {submitting ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin ml-2" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 ml-2" />
                    تأكيد الإيداع
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Internal CopyButton
const CopyButton: React.FC<{ text: string; compact?: boolean }> = ({ text, compact }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: 'تم النسخ' });
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-3 text-xs">
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="h-8 px-4 text-xs rounded-lg border-border/50 hover:border-[hsl(var(--success))] hover:text-[hsl(var(--success))]"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 ml-1" />
          تم
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5 ml-1" />
          نسخ
        </>
      )}
    </Button>
  );
};

export default FlexyDepositForm;
