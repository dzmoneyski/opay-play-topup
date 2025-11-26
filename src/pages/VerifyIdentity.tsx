import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Upload, XCircle, Shield } from 'lucide-react';
import BackButton from '@/components/BackButton';

/**
 * صفحة التحقق من الهوية للمستخدمين
 * يمكن للمستخدم رفع صور الهوية الوطنية
 */
export default function VerifyIdentity() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [nationalId, setNationalId] = useState('');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // التحقق من حالة التحقق
  const verificationStatus = profile?.identity_verification_status;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      toast({
        title: "خطأ",
        description: "يجب اختيار صورة فقط",
        variant: "destructive"
      });
      return;
    }

    // التحقق من حجم الملف (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الصورة يجب أن يكون أقل من 5 ميجابايت",
        variant: "destructive"
      });
      return;
    }

    if (side === 'front') {
      setFrontImage(file);
    } else {
      setBackImage(file);
    }
  };

  const uploadImage = async (file: File, side: 'front' | 'back'): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}_${side}_${Date.now()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('identity-documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    return filePath;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nationalId || !fullName || !frontImage || !backImage) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // رفع الصور
      const frontPath = await uploadImage(frontImage, 'front');
      const backPath = await uploadImage(backImage, 'back');

      // إنشاء طلب التحقق
      const { error } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user?.id,
          national_id: nationalId,
          full_name: fullName,
          date_of_birth: dateOfBirth || null,
          id_front_image: frontPath,
          id_back_image: backPath
        });

      if (error) throw error;

      // تحديث حالة الملف الشخصي
      await supabase
        .from('profiles')
        .update({ identity_verification_status: 'pending' })
        .eq('user_id', user?.id);

      toast({
        title: "تم بنجاح",
        description: "تم تقديم طلب التحقق. سيتم مراجعته قريباً",
      });

      navigate('/');
    } catch (error: any) {
      console.error('خطأ:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء تقديم الطلب",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  // عرض حالة التحقق إذا كان موجود
  if (verificationStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="container mx-auto max-w-2xl py-8">
          <BackButton />
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <Clock className="h-16 w-16 text-yellow-500" />
              </div>
              <CardTitle className="text-center text-2xl">قيد المراجعة</CardTitle>
              <CardDescription className="text-center">
                طلب التحقق من هويتك قيد المراجعة حالياً
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <Clock className="w-4 h-4 ml-2" />
                انتظار الموافقة
              </Badge>
              <p className="mt-4 text-muted-foreground">
                سيتم إخطارك عند مراجعة طلبك
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'verified') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="container mx-auto max-w-2xl py-8">
          <BackButton />
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-center text-2xl">تم التحقق</CardTitle>
              <CardDescription className="text-center">
                تم التحقق من هويتك بنجاح
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Badge variant="default" className="text-lg px-4 py-2 bg-green-600">
                <CheckCircle className="w-4 h-4 ml-2" />
                موثق
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="container mx-auto max-w-2xl py-8">
        <BackButton />
        
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-center text-2xl">التحقق من الهوية</CardTitle>
            <CardDescription className="text-center">
              قم برفع صور الهوية الوطنية للتحقق من حسابك
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* رقم الهوية */}
              <div className="space-y-2">
                <Label htmlFor="nationalId">رقم الهوية الوطنية *</Label>
                <Input
                  id="nationalId"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="أدخل رقم الهوية الوطنية"
                  required
                />
              </div>

              {/* الاسم الكامل */}
              <div className="space-y-2">
                <Label htmlFor="fullName">الاسم الكامل كما في البطاقة *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="أدخل الاسم الكامل"
                  required
                />
              </div>

              {/* تاريخ الميلاد */}
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">تاريخ الميلاد (اختياري)</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>

              {/* الصورة الأمامية */}
              <div className="space-y-2">
                <Label>صورة الوجه الأمامي للهوية *</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, 'front')}
                    className="hidden"
                    id="frontImage"
                  />
                  <label htmlFor="frontImage" className="cursor-pointer">
                    {frontImage ? (
                      <div>
                        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-medium">{frontImage.name}</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">اضغط لاختيار الصورة</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* الصورة الخلفية */}
              <div className="space-y-2">
                <Label>صورة الوجه الخلفي للهوية *</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, 'back')}
                    className="hidden"
                    id="backImage"
                  />
                  <label htmlFor="backImage" className="cursor-pointer">
                    {backImage ? (
                      <div>
                        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-medium">{backImage.name}</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">اضغط لاختيار الصورة</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* زر الإرسال */}
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={loading}
              >
                {loading ? 'جاري الإرسال...' : 'تقديم الطلب'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
