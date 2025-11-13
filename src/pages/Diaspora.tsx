import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useBalance } from '@/hooks/useBalance';
import { useToast } from '@/hooks/use-toast';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';
import BackButton from '@/components/BackButton';
import {
  ArrowLeft,
  Globe2,
  Send,
  Phone,
  DollarSign,
  Users,
  CheckCircle,
  Shield,
  Clock,
  Heart,
  CreditCard,
  Landmark,
  Copy,
  MessageCircle
} from 'lucide-react';

const Diaspora = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance, fetchBalance } = useBalance();
  const { toast } = useToast();
  const { isAdmin } = useUserRoles();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    amount: '',
    senderCountry: '',
    senderCity: '',
    paymentMethod: '',
    transactionReference: '',
    note: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    } else if (isAdmin === false) {
      // If user is not admin, redirect to home
      toast({
        title: "صفحة غير متاحة",
        description: "هذه الصفحة قيد الإنشاء وغير متاحة حالياً",
        variant: "destructive"
      });
      navigate('/');
    }
  }, [user, isAdmin, navigate, toast]);

  if (!user || isAdmin === false) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.senderCountry || !formData.paymentMethod || !formData.transactionReference) {
      toast({
        title: "معلومات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "مبلغ غير صحيح",
        description: "يرجى إدخال مبلغ صحيح",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create a diaspora transfer request
      const { data, error } = await supabase
        .from('diaspora_transfers')
        .insert({
          sender_id: user.id,
          amount: amount,
          sender_country: formData.senderCountry,
          sender_city: formData.senderCity || null,
          payment_method: formData.paymentMethod,
          transaction_reference: formData.transactionReference,
          note: formData.note || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "تم إرسال الطلب بنجاح",
        description: "سيتم مراجعة التحويل وشحن رصيدك قريباً",
      });

      // Reset form
      setFormData({
        amount: '',
        senderCountry: '',
        senderCity: '',
        paymentMethod: '',
        transactionReference: '',
        note: ''
      });

      // Navigate to home after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      console.error('Error creating diaspora transfer:', error);
      toast({
        title: "حدث خطأ",
        description: "يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    { icon: Shield, text: "آمن ومضمون 100%" },
    { icon: Clock, text: "سرعة في التحويل" },
    { icon: DollarSign, text: "أسعار صرف تنافسية" },
    { icon: Heart, text: "دعم عائلتك بسهولة" }
  ];

  const paymentMethods = [
    { name: "Revolut", color: "from-[#0075EB] to-[#00C6FF]", icon: CreditCard },
    { name: "Wise", color: "from-[#9FE870] to-[#37B45B]", icon: Landmark },
    { name: "Paysera", color: "from-[#FF6B35] to-[#F7931E]", icon: CreditCard },
    { name: "SEPA", color: "from-[#003399] to-[#0066CC]", icon: Landmark },
    { name: "Bank Transfer", color: "from-[#6366F1] to-[#8B5CF6]", icon: Landmark },
    { name: "Western Union", color: "from-[#FFCC00] to-[#FF9900]", icon: Send }
  ];

  const bankAccounts = [
    {
      name: "Revolut",
      accountNumber: "GB29 REVO 0099 6900 1234 56",
      accountName: "OpaY Services",
      bic: "REVOGB21",
      currency: "EUR/USD",
      color: "from-[#0075EB] to-[#00C6FF]"
    },
    {
      name: "Wise",
      accountNumber: "BE68 5390 0754 7034",
      accountName: "OpaY International",
      bic: "TRWIBEB1XXX",
      currency: "EUR/USD",
      color: "from-[#9FE870] to-[#37B45B]"
    },
    {
      name: "Paysera",
      accountNumber: "LT12 3456 7890 1234 5678",
      accountName: "OpaY Transfer",
      bic: "EVIULT2VXXX",
      currency: "EUR",
      color: "from-[#FF6B35] to-[#F7931E]"
    }
  ];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "تم النسخ",
      description: `تم نسخ ${label} بنجاح`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <BackButton />
      
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Admin Badge */}
        <div className="mb-4">
          <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  وضع المعاينة - هذه الصفحة مرئية للمشرفين فقط وقيد التطوير
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Globe2 className="w-16 h-16 text-primary animate-pulse" />
              <Heart className="w-6 h-6 text-destructive absolute -top-1 -right-1 animate-bounce" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            الجالية الجزائرية
          </h1>
          <p className="text-muted-foreground text-sm">
            قم بشحن رصيدك من الخارج وأرسل المال لعائلتك بسهولة
          </p>
        </div>

        {/* Benefits Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {benefits.map((benefit, index) => (
            <Card key={index} className="border-primary/20 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-3 flex items-center gap-2">
                <benefit.icon className="w-5 h-5 text-primary" />
                <span className="text-[11px] font-medium">{benefit.text}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment Methods Section */}
        <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              طرق الدفع المدعومة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((method, index) => (
                <div
                  key={index}
                  className={`relative overflow-hidden rounded-lg p-3 bg-gradient-to-br ${method.color} shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105`}
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8" />
                  <div className="relative z-10">
                    <method.icon className="w-5 h-5 text-white mb-1" />
                    <p className="text-[10px] font-bold text-white leading-tight">
                      {method.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-3">
              نقبل التحويلات من جميع البنوك والمحافظ الإلكترونية العالمية
            </p>
          </CardContent>
        </Card>

        {/* Bank Accounts Information */}
        <div className="space-y-3 mb-6">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            معلومات التحويل البنكي
          </h3>
          {bankAccounts.map((account, index) => (
            <Card key={index} className={`border-primary/20 bg-gradient-to-br ${account.color} text-white overflow-hidden`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-base">{account.name}</h4>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{account.currency}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] opacity-80">اسم الحساب</p>
                        <p className="text-xs font-bold">{account.accountName}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:bg-white/20"
                        onClick={() => copyToClipboard(account.accountName, "اسم الحساب")}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] opacity-80">IBAN / رقم الحساب</p>
                        <p className="text-xs font-bold font-mono">{account.accountNumber}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:bg-white/20"
                        onClick={() => copyToClipboard(account.accountNumber, "رقم الحساب")}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] opacity-80">BIC / SWIFT</p>
                        <p className="text-xs font-bold font-mono">{account.bic}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:bg-white/20"
                        onClick={() => copyToClipboard(account.bic, "BIC")}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Instructions */}
        <Card className="border-primary/20 bg-primary/5 mb-6">
          <CardContent className="p-4">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              خطوات التحويل
            </h4>
            <ol className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-bold text-primary">1.</span>
                <span>قم بتحويل المبلغ إلى أحد الحسابات المذكورة أعلاه</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>املأ النموذج أدناه بمعلومات التحويل ورقم المرجع</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">3.</span>
                <span>سيتم شحن رصيدك بعد تأكيد استلام التحويل</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">4.</span>
                <span>استخدم رصيدك لإرسال المال لعائلتك عبر التحويل المحلي</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Main Form */}
        <Card className="border-primary/20 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="w-5 h-5 text-primary" />
              معلومات التحويل
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              بعد إرسال التحويل البنكي، املأ هذا النموذج لشحن رصيدك
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Amount */}
              <div>
                <Label htmlFor="amount" className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  المبلغ المرسل (بالدولار أو اليورو) *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="مثال: 100"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  min="1"
                  step="0.01"
                  className="mt-1.5"
                />
              </div>

              {/* Payment Method */}
              <div>
                <Label htmlFor="paymentMethod" className="text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  طريقة الدفع المستخدمة *
                </Label>
                <select
                  id="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  required
                  className="w-full mt-1.5 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">اختر طريقة الدفع</option>
                  <option value="revolut">Revolut</option>
                  <option value="wise">Wise</option>
                  <option value="paysera">Paysera</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="western_union">Western Union</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              {/* Transaction Reference */}
              <div>
                <Label htmlFor="transactionReference" className="text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  رقم مرجع التحويل *
                </Label>
                <Input
                  id="transactionReference"
                  type="text"
                  placeholder="مثال: REF123456789"
                  value={formData.transactionReference}
                  onChange={(e) => setFormData({ ...formData, transactionReference: e.target.value })}
                  required
                  className="mt-1.5"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  رقم التحويل الذي ظهر لك بعد إتمام العملية
                </p>
              </div>

              {/* Sender Location */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="senderCountry" className="text-sm flex items-center gap-2">
                    <Globe2 className="w-4 h-4" />
                    البلد الذي ترسل منه *
                  </Label>
                  <Input
                    id="senderCountry"
                    type="text"
                    placeholder="مثال: فرنسا، كندا، السعودية"
                    value={formData.senderCountry}
                    onChange={(e) => setFormData({ ...formData, senderCountry: e.target.value })}
                    required
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="senderCity" className="text-sm">
                    المدينة (اختياري)
                  </Label>
                  <Input
                    id="senderCity"
                    type="text"
                    placeholder="مثال: باريس، تورنتو"
                    value={formData.senderCity}
                    onChange={(e) => setFormData({ ...formData, senderCity: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <Label htmlFor="note" className="text-sm">
                  ملاحظات إضافية (اختياري)
                </Label>
                <Textarea
                  id="note"
                  placeholder="أي معلومات إضافية تريد إضافتها"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={3}
                  className="mt-1.5"
                />
              </div>

              {/* Info Alert */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3">
                  <div className="flex gap-2 items-start">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-muted-foreground">
                      بعد التحقق من التحويل، سيتم شحن رصيدك تلقائياً بأفضل سعر صرف. يمكنك بعدها إرسال المال لعائلتك عبر التحويل المحلي
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  "جاري الإرسال..."
                ) : (
                  <>
                    <Send className="w-4 h-4 ml-2" />
                    إرسال الطلب
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="mt-4 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-8 h-8 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">هل لديك استفسار؟</p>
                <p className="text-xs text-muted-foreground">
                  تواصل معنا للحصول على الدعم الفوري
                </p>
              </div>
              <a 
                href="https://t.me/+TRFfgKdTvkI2ZDhk" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button size="sm" className="h-8">
                  <MessageCircle className="w-4 h-4 ml-1" />
                  تواصل
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Diaspora;
