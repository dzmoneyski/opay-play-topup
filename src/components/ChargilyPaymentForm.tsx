import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  CreditCard, 
  ArrowRight, 
  Clock, 
  Shield, 
  Zap,
  CheckCircle,
  Banknote,
  ExternalLink
} from 'lucide-react';
import edahabiyaLogo from '@/assets/edahabiya-logo.png';

interface ChargilyPaymentFormProps {
  onSuccess?: () => void;
}

const ChargilyPaymentForm: React.FC<ChargilyPaymentFormProps> = ({ onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'edahabia' | 'cib'>('edahabia');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const presetAmounts = [500, 1000, 2000, 5000, 10000];

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول أولاً",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 100) {
      toast({
        title: "مبلغ غير صحيح",
        description: "المبلغ يجب أن يكون 100 دج على الأقل",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chargily-checkout', {
        body: { amount: amountNum, payment_method: paymentMethod },
      });

      if (error) throw error;

      if (data?.checkout_url) {
        toast({
          title: "جاري التحويل لصفحة الدفع",
          description: "سيتم تحويلك إلى بوابة الدفع الآمنة",
        });
        // Redirect to Chargily payment page
        window.open(data.checkout_url, '_blank');
        onSuccess?.();
      } else {
        throw new Error("لم يتم الحصول على رابط الدفع");
      }
    } catch (error) {
      console.error('Chargily payment error:', error);
      toast({
        title: "خطأ في عملية الدفع",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card/95 backdrop-blur-xl border border-border/30 shadow-elevated animate-slide-up overflow-hidden" style={{ animationDelay: '0.3s' }}>
      {/* Header */}
      <div className="relative bg-gradient-to-br from-accent/10 via-primary/5 to-transparent border-b border-border/30 p-8">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl blur-md opacity-50 bg-gradient-gold"></div>
            <div className="relative p-4 rounded-3xl bg-white shadow-lg">
              <img src={edahabiyaLogo} alt="الذهبية" className="h-12 w-12 object-contain" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-foreground">الدفع الإلكتروني</h2>
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                <Zap className="h-3 w-3 ml-1" />
                تلقائي
              </Badge>
            </div>
            <p className="text-muted-foreground">ادفع ببطاقة الذهبية أو CIB - يتم إضافة الرصيد فوراً</p>
          </div>
        </div>
      </div>

      <CardContent className="p-8 lg:p-10 space-y-8">
        {/* Features */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-2xl">
            <Zap className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-green-700 dark:text-green-400">رصيد فوري</p>
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl">
            <Shield className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-blue-700 dark:text-blue-400">دفع آمن</p>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl">
            <CheckCircle className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-purple-700 dark:text-purple-400">بدون وصل</p>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="space-y-3">
          <Label className="text-foreground font-semibold text-base">اختر نوع البطاقة</Label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setPaymentMethod('edahabia')}
              className={`p-5 rounded-2xl border-2 transition-all hover:scale-[1.02] ${
                paymentMethod === 'edahabia'
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <CreditCard className={`h-8 w-8 ${paymentMethod === 'edahabia' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`font-bold ${paymentMethod === 'edahabia' ? 'text-primary' : 'text-foreground'}`}>
                  بطاقة الذهبية
                </span>
                <span className="text-xs text-muted-foreground">Edahabia</span>
              </div>
              {paymentMethod === 'edahabia' && (
                <div className="flex justify-center mt-2">
                  <div className="p-1 rounded-full bg-primary">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                </div>
              )}
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('cib')}
              className={`p-5 rounded-2xl border-2 transition-all hover:scale-[1.02] ${
                paymentMethod === 'cib'
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <CreditCard className={`h-8 w-8 ${paymentMethod === 'cib' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`font-bold ${paymentMethod === 'cib' ? 'text-primary' : 'text-foreground'}`}>
                  بطاقة CIB
                </span>
                <span className="text-xs text-muted-foreground">البنكية</span>
              </div>
              {paymentMethod === 'cib' && (
                <div className="flex justify-center mt-2">
                  <div className="p-1 rounded-full bg-primary">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-3">
          <Label className="text-foreground font-semibold text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent/10">
              <Banknote className="h-4 w-4 text-accent" />
            </div>
            المبلغ (دج)
          </Label>
          <Input
            type="number"
            placeholder="أدخل المبلغ (100 دج كحد أدنى)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-14 text-lg rounded-xl border-2 focus:border-accent text-center font-bold"
            min={100}
          />
          {/* Preset Amounts */}
          <div className="flex flex-wrap gap-2 justify-center">
            {presetAmounts.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount(preset.toString())}
                className={`rounded-xl font-bold transition-all hover:scale-105 ${
                  amount === preset.toString() ? 'bg-primary text-white border-primary' : ''
                }`}
              >
                {preset.toLocaleString()} دج
              </Button>
            ))}
          </div>
        </div>

        {/* Amount Summary */}
        {parseFloat(amount) >= 100 && (
          <div className="p-6 bg-accent/5 rounded-2xl border border-accent/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted-foreground">المبلغ المدفوع</span>
              <span className="font-bold text-foreground">{parseFloat(amount).toLocaleString()} دج</span>
            </div>
            <Separator className="my-3" />
            <div className="flex items-center justify-between">
              <span className="text-foreground font-bold text-lg">المبلغ المضاف للرصيد</span>
              <span className="font-bold text-accent text-xl">{parseFloat(amount).toLocaleString()} دج</span>
            </div>
          </div>
        )}

        {/* Pay Button */}
        <Button
          onClick={handlePayment}
          className="w-full bg-gradient-gold hover:opacity-90 text-white font-bold py-6 text-lg rounded-2xl shadow-lg"
          disabled={loading || !amount || parseFloat(amount) < 100}
        >
          {loading ? (
            <>
              <Clock className="h-5 w-5 animate-spin ml-2" />
              جاري التحويل لبوابة الدفع...
            </>
          ) : (
            <>
              <ExternalLink className="h-5 w-5 ml-2" />
              الدفع الآن عبر Chargily Pay
              <ArrowRight className="h-5 w-5 mr-2" />
            </>
          )}
        </Button>

        {/* Security Notice */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>دفع آمن ومشفر عبر بوابة Chargily Pay المعتمدة</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChargilyPaymentForm;
