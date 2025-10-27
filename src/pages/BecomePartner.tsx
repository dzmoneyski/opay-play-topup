import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMerchantRequest } from '@/hooks/useMerchantRequest';
import { useAuth } from '@/hooks/useAuth';
import { Store, Gamepad2, Monitor, Building2, ArrowRight, CheckCircle2, TrendingUp, Users, Wallet } from 'lucide-react';
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
    <div className="min-h-screen p-4">
      <BackButton />
      
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto mt-8 mb-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">كن شريكاً معنا</h1>
          <p className="text-xl text-muted-foreground">
            انضم إلى شبكة تجارنا واربح عمولة على كل عملية
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="pt-6">
              <TrendingUp className="h-12 w-12 mb-4 text-primary" />
              <h3 className="text-lg font-bold mb-2">عمولات مجزية</h3>
              <p className="text-muted-foreground">
                احصل على عمولة من 2% إلى 5% على كل عملية شحن
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Users className="h-12 w-12 mb-4 text-primary" />
              <h3 className="text-lg font-bold mb-2">اجذب عملاء جدد</h3>
              <p className="text-muted-foreground">
                قدم خدمة الشحن لعملائك واربح منها
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Wallet className="h-12 w-12 mb-4 text-primary" />
              <h3 className="text-lg font-bold mb-2">سحب سريع للأرباح</h3>
              <p className="text-muted-foreground">
                اسحب أرباحك بسهولة في أي وقت
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Registration Form */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>نموذج التسجيل</CardTitle>
            <CardDescription>
              املأ البيانات التالية وسيتم مراجعة طلبك في أقرب وقت
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="business_name">اسم النشاط التجاري *</Label>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  placeholder="مثال: محل الهواتف الذكية"
                  required
                />
              </div>

              <div>
                <Label htmlFor="business_type">نوع النشاط *</Label>
                <Select
                  value={formData.business_type}
                  onValueChange={(value) => setFormData({ ...formData, business_type: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع النشاط" />
                  </SelectTrigger>
                  <SelectContent>
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

              <div>
                <Label htmlFor="phone">رقم الهاتف *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="05xxxxxxxx"
                  required
                />
              </div>

              <div>
                <Label htmlFor="address">العنوان *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="المدينة، الولاية"
                  required
                />
              </div>

              <div>
                <Label htmlFor="national_id">رقم بطاقة التعريف الوطنية *</Label>
                <Input
                  id="national_id"
                  value={formData.national_id}
                  onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                  placeholder="رقم البطاقة"
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">ملاحظات إضافية (اختياري)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أي معلومات إضافية تريد إضافتها..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BecomePartner;
