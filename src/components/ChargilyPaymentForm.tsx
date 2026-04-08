import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  ArrowLeft, 
  Clock, 
  Shield, 
  Zap,
  CheckCircle,
  Banknote,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Star,
  Lock
} from 'lucide-react';
import edahabiyaLogo from '@/assets/edahabiya-logo.png';

interface ChargilyPaymentFormProps {
  onSuccess?: () => void;
}

const ChargilyPaymentForm: React.FC<ChargilyPaymentFormProps> = ({ onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'edahabia' | 'cib'>('edahabia');
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  const presetAmounts = [500, 1000, 2000, 5000, 10000];

  // Animate steps
  useEffect(() => {
    if (parseFloat(amount) >= 100) {
      setActiveStep(2);
    } else if (paymentMethod) {
      setActiveStep(1);
    }
  }, [amount, paymentMethod]);

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
          title: "✅ جاري التحويل لصفحة الدفع",
          description: "سيتم تحويلك إلى بوابة الدفع الآمنة...",
        });
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

  const amountNum = parseFloat(amount) || 0;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djJIMjR2LTJoMTJ6TTM2IDI0djJIMjR2LTJoMTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="relative p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="relative"
              >
                <div className="absolute inset-0 rounded-2xl blur-lg bg-white/30" />
                <div className="relative p-3 rounded-2xl bg-white shadow-xl">
                  <img src={edahabiyaLogo} alt="الذهبية" className="h-10 w-10 md:h-12 md:w-12 object-contain" />
                </div>
              </motion.div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  الدفع بالذهبية
                  <Sparkles className="h-5 w-5 text-yellow-200" />
                </h2>
                <p className="text-white/80 text-sm mt-0.5">رصيدك يُضاف فوراً وتلقائياً</p>
              </div>
            </div>
            
            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs font-bold px-3 py-1.5">
              <Zap className="h-3.5 w-3.5 ml-1 text-yellow-200" />
              LIVE
            </Badge>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center gap-4 mt-5 flex-wrap">
            {[
              { icon: Zap, text: "رصيد فوري", color: "text-yellow-200" },
              { icon: Shield, text: "100% آمن", color: "text-green-200" },
              { icon: Lock, text: "مشفّر", color: "text-blue-200" },
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5"
              >
                <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                <span className="text-white text-xs font-medium">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Payment Method Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border/40 shadow-lg overflow-hidden">
          <CardContent className="p-5 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <Label className="text-foreground font-bold text-sm">اختر نوع البطاقة</Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'edahabia' as const, name: 'بطاقة الذهبية', sub: 'Edahabia', gradient: 'from-amber-500 to-yellow-600' },
                { id: 'cib' as const, name: 'بطاقة CIB', sub: 'البنكية', gradient: 'from-blue-500 to-indigo-600' },
              ].map((method) => (
                <motion.button
                  key={method.id}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`relative p-4 md:p-5 rounded-2xl border-2 transition-all duration-300 ${
                    paymentMethod === method.id
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                      : 'border-border/50 hover:border-primary/30 bg-card'
                  }`}
                >
                  {paymentMethod === method.id && (
                    <motion.div 
                      layoutId="paymentCheck"
                      className="absolute top-2 left-2 p-1 rounded-full bg-primary"
                    >
                      <CheckCircle className="h-3 w-3 text-primary-foreground" />
                    </motion.div>
                  )}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${method.gradient}`}>
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    <span className={`font-bold text-sm ${paymentMethod === method.id ? 'text-primary' : 'text-foreground'}`}>
                      {method.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{method.sub}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Amount Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border/40 shadow-lg overflow-hidden">
          <CardContent className="p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <Banknote className="h-4 w-4 text-accent" />
              </div>
              <Label className="text-foreground font-bold text-sm">المبلغ (دج)</Label>
            </div>

            <div className="relative">
              <Input
                type="number"
                placeholder="أدخل المبلغ..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-16 text-2xl rounded-2xl border-2 focus:border-primary text-center font-black bg-muted/30 placeholder:text-base placeholder:font-normal"
                min={100}
              />
              {amountNum > 0 && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold"
                >
                  دج
                </motion.span>
              )}
            </div>

            {/* Preset Amounts - pill style */}
            <div className="flex flex-wrap gap-2 justify-center">
              {presetAmounts.map((preset, i) => (
                <motion.button
                  key={preset}
                  type="button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setAmount(preset.toString())}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                    amount === preset.toString()
                      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25'
                      : 'bg-muted/50 text-foreground hover:bg-muted border border-border/50'
                  }`}
                >
                  {preset.toLocaleString('ar-DZ')} دج
                </motion.button>
              ))}
            </div>

            {amountNum > 0 && amountNum < 100 && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-destructive text-xs text-center font-medium"
              >
                ⚠️ الحد الأدنى هو 100 دج
              </motion.p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary & Pay */}
      <AnimatePresence>
        {amountNum >= 100 && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <Card className="border-primary/20 shadow-xl shadow-primary/5 overflow-hidden">
              {/* Glowing top border */}
              <div className="h-1 bg-gradient-to-r from-amber-400 via-primary to-accent" />
              
              <CardContent className="p-5 md:p-6 space-y-5">
                {/* Summary */}
                <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">نوع البطاقة</span>
                    <span className="font-bold text-foreground text-sm">
                      {paymentMethod === 'edahabia' ? 'بطاقة الذهبية' : 'بطاقة CIB'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">المبلغ المدفوع</span>
                    <span className="font-bold text-foreground">{amountNum.toLocaleString('ar-DZ')} دج</span>
                  </div>
                  <div className="h-px bg-border/50" />
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-bold flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      يُضاف لرصيدك
                    </span>
                    <motion.span 
                      key={amountNum}
                      initial={{ scale: 1.3, color: "hsl(var(--accent))" }}
                      animate={{ scale: 1, color: "hsl(var(--accent))" }}
                      className="font-black text-xl"
                    >
                      {amountNum.toLocaleString('ar-DZ')} دج
                    </motion.span>
                  </div>
                </div>

                {/* Pay Button */}
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button
                    onClick={handlePayment}
                    className="w-full relative overflow-hidden bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:from-amber-600 hover:via-yellow-600 hover:to-orange-600 text-white font-black py-7 text-lg rounded-2xl shadow-xl shadow-amber-500/25 border-0"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Clock className="h-5 w-5 animate-spin" />
                        جاري التحويل لبوابة الدفع...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <ExternalLink className="h-5 w-5" />
                        ادفع {amountNum.toLocaleString('ar-DZ')} دج الآن
                        <ArrowLeft className="h-5 w-5" />
                      </span>
                    )}
                    
                    {/* Shimmer effect */}
                    {!loading && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      />
                    )}
                  </Button>
                </motion.div>

                {/* Trust bar */}
                <div className="flex items-center justify-center gap-3 pt-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Shield className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs">دفع آمن</span>
                  </div>
                  <span className="text-muted-foreground/30">•</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs">تشفير SSL</span>
                  </div>
                  <span className="text-muted-foreground/30">•</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs">Chargily Pay</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom notice when no amount */}
      {amountNum < 100 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center p-4 bg-muted/30 rounded-2xl border border-border/30"
        >
          <Sparkles className="h-8 w-8 text-amber-400 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground font-medium">
            اختر مبلغاً أو أدخل المبلغ المطلوب للبدء
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            الحد الأدنى 100 دج — يتم إضافة الرصيد فوراً بعد الدفع
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default ChargilyPaymentForm;
