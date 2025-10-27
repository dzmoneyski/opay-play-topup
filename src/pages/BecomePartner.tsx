import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useMerchantRequest } from '@/hooks/useMerchantRequest';
import { useAuth } from '@/hooks/useAuth';
import { Store, Gamepad2, Monitor, Building2, ArrowRight, CheckCircle2, TrendingUp, Users, Wallet, Zap, Shield, Clock, Star, Gift, Award, Sparkles, Phone, MapPin, CreditCard } from 'lucide-react';
import BackButton from '@/components/BackButton';

const BecomePartner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { submitRequest, getMyRequest, loading } = useMerchantRequest();
  const [existingRequest, setExistingRequest] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    business_name: '',
    business_type: '',
    phone: '',
    address: '',
    national_id: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      checkExistingRequest();
    }
  }, [user]);

  const checkExistingRequest = async () => {
    const request = await getMyRequest();
    setExistingRequest(request);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.business_name || !formData.business_type || !formData.phone || !formData.address || !formData.national_id) {
      return;
    }

    const result = await submitRequest(formData);
    if (result.success) {
      checkExistingRequest();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>يجب تسجيل الدخول</CardTitle>
            <CardDescription>الرجاء تسجيل الدخول للتسجيل كشريك</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              تسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (existingRequest) {
    const statusText = {
      pending: 'قيد المراجعة',
      approved: 'تمت الموافقة',
      rejected: 'مرفوض'
    }[existingRequest.status] || existingRequest.status;

    const statusColor = {
      pending: 'text-yellow-600',
      approved: 'text-green-600',
      rejected: 'text-red-600'
    }[existingRequest.status] || 'text-gray-600';

    return (
      <div className="min-h-screen p-4">
        <BackButton />
        <div className="max-w-2xl mx-auto mt-8">
          <Card>
            <CardHeader>
              <CardTitle>طلبك للانضمام كشريك</CardTitle>
              <CardDescription className={statusColor}>الحالة: {statusText}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">اسم النشاط التجاري</p>
                <p className="font-medium">{existingRequest.business_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                <p className="font-medium">{existingRequest.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">العنوان</p>
                <p className="font-medium">{existingRequest.address}</p>
              </div>
              {existingRequest.status === 'rejected' && existingRequest.rejection_reason && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">سبب الرفض:</p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">{existingRequest.rejection_reason}</p>
                </div>
              )}
              {existingRequest.status === 'approved' && (
                <Button onClick={() => navigate('/merchant')} className="w-full">
                  <ArrowRight className="ml-2 h-4 w-4" />
                  الذهاب إلى لوحة التحكم
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <BackButton />
      
      {/* Hero Section with Gradient */}
      <div className="relative overflow-hidden bg-gradient-hero py-20 px-4">
        <div className="absolute inset-0 bg-gradient-glass"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-primary rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-12 animate-fade-in">
            <Badge className="mb-4 bg-white/20 text-white border-white/30 backdrop-blur-sm">
              <Sparkles className="h-3 w-3 ml-1" />
              فرصة ذهبية للربح
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white">
              كن شريكاً معنا
              <span className="block text-4xl md:text-5xl mt-2 bg-gradient-to-r from-yellow-200 to-yellow-400 bg-clip-text text-transparent">
                واربح مع كل عملية! 💰
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-8">
              انضم إلى شبكة تجارنا المتنامية واحصل على دخل إضافي من خلال تقديم خدمات الشحن لعملائك
            </p>
            
            {/* Live Stats */}
            <div className="flex flex-wrap justify-center gap-8 mb-8">
              <div className="text-center animate-scale-in" style={{ animationDelay: '0.2s' }}>
                <div className="text-4xl font-bold text-white mb-1">500+</div>
                <div className="text-white/70 text-sm">تاجر نشط</div>
              </div>
              <div className="text-center animate-scale-in" style={{ animationDelay: '0.4s' }}>
                <div className="text-4xl font-bold text-white mb-1">15,000+</div>
                <div className="text-white/70 text-sm">عملية شهرياً</div>
              </div>
              <div className="text-center animate-scale-in" style={{ animationDelay: '0.6s' }}>
                <div className="text-4xl font-bold text-white mb-1">5%</div>
                <div className="text-white/70 text-sm">عمولة تصل إلى</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 -mt-16 relative z-20">
        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16 animate-slide-up">
          <Card className="border-0 shadow-elevated bg-gradient-card backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="pt-8 text-center">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-primary mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">عمولات مجزية</h3>
              <p className="text-muted-foreground leading-relaxed">
                احصل على عمولة من <span className="font-bold text-primary">2% إلى 5%</span> على كل عملية شحن
              </p>
              <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium text-primary">مثال: 50,000 دج معاملات = 2,500 دج عمولة! 💸</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-elevated bg-gradient-card backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="pt-8 text-center">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-secondary mb-4">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">نظام سهل وسريع</h3>
              <p className="text-muted-foreground leading-relaxed">
                شحن الحسابات في <span className="font-bold text-secondary">ثوانٍ معدودة</span> من لوحة تحكم بسيطة
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Badge variant="secondary">لا رسوم خفية</Badge>
                <Badge variant="secondary">سريع</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-elevated bg-gradient-card backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="pt-8 text-center">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-gold mb-4">
                <Wallet className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">سحب فوري للأرباح</h3>
              <p className="text-muted-foreground leading-relaxed">
                اسحب أرباحك <span className="font-bold text-yellow-600">في أي وقت</span> بدون حد أدنى
              </p>
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">متاح 24/7 ⚡</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Benefits */}
        <Card className="mb-16 border-0 shadow-card bg-gradient-card backdrop-blur-sm animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Star className="h-6 w-6 text-yellow-500" />
              لماذا تختار OpaY؟
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div>
                  <h4 className="font-bold mb-2">دعم فني متواصل</h4>
                  <p className="text-sm text-muted-foreground">فريقنا جاهز لمساعدتك في أي وقت عبر الهاتف أو الواتساب</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h4 className="font-bold mb-2">أمان مضمون 100%</h4>
                  <p className="text-sm text-muted-foreground">جميع المعاملات مشفرة ومحمية بأعلى معايير الأمان</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Gift className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div>
                  <h4 className="font-bold mb-2">مكافآت شهرية</h4>
                  <p className="text-sm text-muted-foreground">جوائز ومكافآت للتجار الأكثر نشاطاً كل شهر</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Award className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div>
                  <h4 className="font-bold mb-2">نظام مستويات</h4>
                  <p className="text-sm text-muted-foreground">ارتقِ للمستويات الأعلى واحصل على عمولات أكبر</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps Section */}
        <div className="mb-16 animate-fade-in">
          <h2 className="text-3xl font-bold text-center mb-12">
            كيف تبدأ؟ <span className="text-primary">3 خطوات فقط!</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  1
                </div>
                <div className="absolute -top-2 -right-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-400 animate-ping"></div>
                  <div className="w-8 h-8 rounded-full bg-yellow-400 absolute top-0"></div>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">سجل بياناتك</h3>
              <p className="text-muted-foreground">املأ نموذج التسجيل البسيط أدناه</p>
            </div>

            <div className="text-center">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-secondary flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  2
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">انتظر الموافقة</h3>
              <p className="text-muted-foreground">سنراجع طلبك خلال 24 ساعة فقط</p>
            </div>

            <div className="text-center">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-gold flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  3
                </div>
                <div className="absolute -top-2 -right-2">
                  <Sparkles className="h-8 w-8 text-yellow-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">ابدأ الربح!</h3>
              <p className="text-muted-foreground">اشحن حسابات العملاء واربح فوراً</p>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <Card className="max-w-3xl mx-auto mb-16 border-0 shadow-elevated bg-gradient-card backdrop-blur-sm animate-scale-in">
          <CardHeader className="text-center pb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4 mx-auto">
              <Store className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl mb-2">سجل الآن مجاناً</CardTitle>
            <CardDescription className="text-lg">
              انضم لمئات التجار الناجحين واربح من اليوم الأول 🚀
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="business_name" className="text-base font-semibold flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    اسم النشاط التجاري *
                  </Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    placeholder="مثال: محل الهواتف الذكية"
                    className="mt-2 h-12"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="business_type" className="text-base font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    نوع النشاط *
                  </Label>
                  <Select
                    value={formData.business_type}
                    onValueChange={(value) => setFormData({ ...formData, business_type: value })}
                    required
                  >
                    <SelectTrigger className="mt-2 h-12">
                      <SelectValue placeholder="اختر نوع النشاط" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="phone_store">
                        <div className="flex items-center">
                          <Store className="ml-2 h-4 w-4" />
                          محل هواتف
                        </div>
                      </SelectItem>
                      <SelectItem value="gaming_shop">
                        <div className="flex items-center">
                          <Gamepad2 className="ml-2 h-4 w-4" />
                          محل ألعاب
                        </div>
                      </SelectItem>
                      <SelectItem value="internet_cafe">
                        <div className="flex items-center">
                          <Monitor className="ml-2 h-4 w-4" />
                          قهوة إنترنت
                        </div>
                      </SelectItem>
                      <SelectItem value="other">
                        <div className="flex items-center">
                          <Building2 className="ml-2 h-4 w-4" />
                          أخرى
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="phone" className="text-base font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    رقم الهاتف *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="05xxxxxxxx"
                    className="mt-2 h-12"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">سنتواصل معك عبر هذا الرقم</p>
                </div>

                <div>
                  <Label htmlFor="address" className="text-base font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    العنوان *
                  </Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="المدينة، الولاية"
                    className="mt-2 h-12"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="national_id" className="text-base font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  رقم بطاقة التعريف الوطنية *
                </Label>
                <Input
                  id="national_id"
                  value={formData.national_id}
                  onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                  placeholder="رقم البطاقة"
                  className="mt-2 h-12"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">للتحقق من هويتك (معلومات سرية ومحمية)</p>
              </div>

              <div>
                <Label htmlFor="notes" className="text-base font-semibold">ملاحظات إضافية (اختياري)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أخبرنا المزيد عن نشاطك التجاري أو أي معلومات إضافية..."
                  rows={4}
                  className="mt-2 resize-none"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      🔒 خصوصيتك مهمة لنا
                    </p>
                    <p className="text-blue-700 dark:text-blue-300">
                      جميع بياناتك مشفرة ومحمية. لن نشارك معلوماتك مع أي طرف ثالث.
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                size="lg"
                className="w-full h-14 text-lg font-bold bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-105 shadow-lg" 
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    جاري الإرسال...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    إرسال الطلب الآن
                    <ArrowRight className="h-5 w-5" />
                  </span>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                بالتسجيل، أنت توافق على{' '}
                <a href="#" className="text-primary hover:underline">شروط الاستخدام</a>
                {' '}و{' '}
                <a href="#" className="text-primary hover:underline">سياسة الخصوصية</a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BecomePartner;
