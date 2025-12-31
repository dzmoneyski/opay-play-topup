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
  const {
    user
  } = useAuth();
  const {
    submitRequest,
    getMyRequest,
    loading
  } = useMerchantRequest();
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
    return <div className="min-h-screen flex items-center justify-center p-4">
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
      </div>;
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
    return <div className="min-h-screen p-4">
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
              {existingRequest.status === 'rejected' && existingRequest.rejection_reason && <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">سبب الرفض:</p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">{existingRequest.rejection_reason}</p>
                </div>}
              {existingRequest.status === 'approved' && <Button onClick={() => navigate('/merchant')} className="w-full">
                  <ArrowRight className="ml-2 h-4 w-4" />
                  الذهاب إلى لوحة التحكم
                </Button>}
            </CardContent>
          </Card>
        </div>
      </div>;
  }
  // Service temporarily disabled
  return (
    <div className="min-h-screen bg-background">
      <BackButton />
      
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
        <Card className="max-w-lg w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl">الخدمة متوقفة مؤقتاً</CardTitle>
            <CardDescription className="text-lg mt-2">
              نعتذر، خدمة "كن وكيل" متوقفة مؤقتاً للصيانة والتحسين
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                سنعود قريباً بخدمات أفضل وأكثر أماناً. شكراً لتفهمكم.
              </p>
            </div>
            <Button onClick={() => navigate('/')} className="w-full">
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة للصفحة الرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BecomePartner;