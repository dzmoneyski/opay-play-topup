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
import { Store, Gamepad2, Monitor, Building2, ArrowRight, CheckCircle2, TrendingUp, Users, Wallet, Zap, Shield, Clock, Star, Gift, Award, Sparkles, Phone, MapPin, CreditCard, BadgeCheck, Coins, Percent, Loader2 } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { motion } from 'framer-motion';

const BecomePartner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { submitRequest, getMyRequest, loading } = useMerchantRequest();
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [checkingRequest, setCheckingRequest] = useState(true);
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
    } else {
      setCheckingRequest(false);
    }
  }, [user]);

  const checkExistingRequest = async () => {
    setCheckingRequest(true);
    const request = await getMyRequest();
    setExistingRequest(request);
    setCheckingRequest(false);
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

  const businessTypes = [
    { value: 'gaming_shop', label: 'محل ألعاب إلكترونية', icon: Gamepad2 },
    { value: 'cyber_cafe', label: 'سايبر / مقهى إنترنت', icon: Monitor },
    { value: 'phone_shop', label: 'محل هواتف', icon: Phone },
    { value: 'general_store', label: 'متجر عام', icon: Store },
    { value: 'other', label: 'أخرى', icon: Building2 }
  ];

  const benefits = [
    { icon: Percent, title: 'عمولة على كل عملية', description: 'احصل على نسبة من كل معاملة تقوم بها' },
    { icon: Coins, title: 'أرباح يومية', description: 'سحب أرباحك في أي وقت تريده' },
    { icon: Shield, title: 'دعم فني 24/7', description: 'فريق دعم متاح على مدار الساعة' },
    { icon: Zap, title: 'معاملات سريعة', description: 'تنفيذ فوري لجميع العمليات' }
  ];

  // Loading state
  if (checkingRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <BackButton />
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full"
          >
            <Card className="border-2 shadow-lg">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Store className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">انضم كشريك</CardTitle>
                <CardDescription className="text-base">
                  يجب تسجيل الدخول أولاً للتسجيل كشريك
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/auth')} className="w-full" size="lg">
                  تسجيل الدخول
                  <ArrowRight className="mr-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Existing request status
  if (existingRequest) {
    const statusConfig = {
      pending: { 
        text: 'قيد المراجعة', 
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        icon: Clock,
        description: 'طلبك قيد المراجعة من قبل الإدارة'
      },
      approved: { 
        text: 'تمت الموافقة', 
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        icon: CheckCircle2,
        description: 'تهانينا! تمت الموافقة على طلبك'
      },
      rejected: { 
        text: 'مرفوض', 
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        icon: Shield,
        description: 'للأسف تم رفض طلبك'
      }
    };

    const status = statusConfig[existingRequest.status as keyof typeof statusConfig] || statusConfig.pending;
    const StatusIcon = status.icon;

    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <BackButton />
        <div className="max-w-2xl mx-auto p-4 pt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-2 shadow-lg overflow-hidden">
              <div className={`p-4 ${existingRequest.status === 'approved' ? 'bg-green-50 dark:bg-green-900/20' : existingRequest.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${status.color}`}>
                    <StatusIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <Badge className={status.color}>{status.text}</Badge>
                    <p className="text-sm text-muted-foreground mt-1">{status.description}</p>
                  </div>
                </div>
              </div>

              <CardHeader>
                <CardTitle>تفاصيل طلبك</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Store className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">اسم النشاط التجاري</p>
                      <p className="font-medium">{existingRequest.business_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                      <p className="font-medium" dir="ltr">{existingRequest.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">العنوان</p>
                      <p className="font-medium">{existingRequest.address}</p>
                    </div>
                  </div>
                </div>

                {existingRequest.status === 'rejected' && existingRequest.rejection_reason && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">سبب الرفض:</p>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">{existingRequest.rejection_reason}</p>
                  </div>
                )}

                {existingRequest.status === 'approved' && (
                  <Button onClick={() => navigate('/merchant')} className="w-full" size="lg">
                    <ArrowRight className="ml-2 h-4 w-4" />
                    الذهاب إلى لوحة التحكم
                  </Button>
                )}

                {existingRequest.status === 'pending' && (
                  <div className="text-center text-sm text-muted-foreground">
                    سيتم إعلامك فور مراجعة طلبك
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <BackButton />
      
      <div className="max-w-4xl mx-auto p-4 pt-6">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            انضم لشبكة شركائنا
          </div>
          <h1 className="text-3xl font-bold mb-2">كن وكيلاً معتمداً</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            احصل على أرباح إضافية من خلال تقديم خدمات الشحن والدفع الإلكتروني لعملائك
          </p>
        </motion.div>

        {/* Benefits */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
        >
          {benefits.map((benefit, index) => (
            <Card key={index} className="border bg-card/50 backdrop-blur">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium text-sm mb-1">{benefit.title}</h3>
                <p className="text-xs text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Registration Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-primary" />
                نموذج التسجيل
              </CardTitle>
              <CardDescription>
                أكمل البيانات التالية لتقديم طلب الانضمام
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Business Name */}
                <div className="space-y-2">
                  <Label htmlFor="business_name" className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    اسم النشاط التجاري
                  </Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    placeholder="مثال: محل الألعاب الذهبية"
                    required
                    className="h-12"
                  />
                </div>

                {/* Business Type */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    نوع النشاط
                  </Label>
                  <Select
                    value={formData.business_type}
                    onValueChange={(value) => setFormData({ ...formData, business_type: value })}
                    required
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="اختر نوع النشاط" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    رقم الهاتف
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="05XXXXXXXX"
                    required
                    dir="ltr"
                    className="h-12"
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    العنوان الكامل
                  </Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="الولاية، البلدية، الحي، الشارع"
                    required
                    className="h-12"
                  />
                </div>

                {/* National ID */}
                <div className="space-y-2">
                  <Label htmlFor="national_id" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    رقم بطاقة التعريف الوطنية
                  </Label>
                  <Input
                    id="national_id"
                    value={formData.national_id}
                    onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                    placeholder="أدخل رقم البطاقة الوطنية"
                    required
                    dir="ltr"
                    className="h-12"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    ملاحظات إضافية (اختياري)
                  </Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="أي معلومات إضافية تود مشاركتها..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="ml-2 h-5 w-5" />
                      إرسال الطلب
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  بإرسال الطلب أنت توافق على شروط وأحكام الخدمة
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default BecomePartner;
