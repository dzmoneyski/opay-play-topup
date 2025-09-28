import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Camera, CheckCircle, AlertCircle } from 'lucide-react';

interface IdentityVerificationProps {
  onSuccess?: () => void;
}

export const IdentityVerification: React.FC<IdentityVerificationProps> = ({ onSuccess }) => {
  const { profile, submitIdentityVerification } = useProfile();
  const { toast } = useToast();
  
  const [nationalId, setNationalId] = useState('');
  const [fullNameOnId, setFullNameOnId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [frontImagePreview, setFrontImagePreview] = useState<string | null>(null);
  const [backImagePreview, setBackImagePreview] = useState<string | null>(null);

  const handleFileSelect = (file: File, type: 'front' | 'back') => {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "خطأ في الملف",
        description: "حجم الملف يجب أن يكون أقل من 5 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "نوع ملف غير مدعوم",
        description: "يرجى اختيار صورة بصيغة JPG أو PNG",
        variant: "destructive",
      });
      return;
    }

    if (type === 'front') {
      setFrontImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setFrontImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setBackImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setBackImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nationalId.trim()) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى إدخال رقم الهوية الوطنية",
        variant: "destructive",
      });
      return;
    }

    if (!fullNameOnId.trim()) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى إدخال الاسم الكامل كما هو مكتوب في البطاقة",
        variant: "destructive",
      });
      return;
    }

    if (!dateOfBirth.trim()) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى إدخال تاريخ الميلاد",
        variant: "destructive",
      });
      return;
    }

    if (!frontImage && !backImage) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى رفع صورة واحدة على الأقل من الهوية",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const result = await submitIdentityVerification(
        nationalId, 
        frontImage || undefined, 
        backImage || undefined,
        {
          fullNameOnId,
          dateOfBirth,
          placeOfBirth,
          address
        }
      );
      
      if (result.error) {
        toast({
          title: "خطأ في إرسال الطلب",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "تم إرسال الطلب بنجاح",
          description: "سيتم مراجعة طلبك وإشعارك بالنتيجة قريباً",
        });
        
        // Reset form
        setNationalId('');
        setFullNameOnId('');
        setDateOfBirth('');
        setPlaceOfBirth('');
        setAddress('');
        setFrontImage(null);
        setBackImage(null);
        setFrontImagePreview(null);
        setBackImagePreview(null);
        
        onSuccess?.();
      }
    } catch (error) {
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء إرسال الطلب، يرجى المحاولة لاحقاً",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // If user already has a pending or verified identity
  if (profile?.identity_verification_status === 'pending') {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="h-5 w-5" />
            طلب قيد المراجعة
          </CardTitle>
          <CardDescription className="text-yellow-700">
            تم إرسال طلب تحقق الهوية الخاص بك وهو قيد المراجعة حالياً. سيتم إشعارك بالنتيجة قريباً.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (profile?.identity_verification_status === 'verified') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            تم تحقق الهوية
          </CardTitle>
          <CardDescription className="text-green-700">
            تم تحقق هويتك بنجاح وتم تفعيل حسابك.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          تحقق الهوية
        </CardTitle>
        <CardDescription>
          قم برفع صور الهوية الوطنية لتفعيل حسابك والوصول لجميع الخدمات
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">المعلومات الشخصية</h3>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                يرجى إدخال المعلومات بالضبط كما هي مكتوبة في بطاقة الهوية الوطنية
              </p>
            </div>
            
            {/* National ID Input */}
            <div className="space-y-2">
              <Label htmlFor="nationalId">رقم الهوية الوطنية *</Label>
              <Input
                id="nationalId"
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="أدخل رقم الهوية الوطنية (18 رقم)"
                maxLength={18}
                className="text-right"
                disabled={loading}
              />
            </div>

            {/* Full Name on ID */}
            <div className="space-y-2">
              <Label htmlFor="fullNameOnId">الاسم الكامل كما هو مكتوب في البطاقة *</Label>
              <Input
                id="fullNameOnId"
                type="text"
                value={fullNameOnId}
                onChange={(e) => setFullNameOnId(e.target.value)}
                placeholder="الاسم الكامل بالضبط كما هو في البطاقة"
                className="text-right"
                disabled={loading}
              />
              {profile?.full_name && fullNameOnId && fullNameOnId !== profile.full_name && (
                <div className="flex items-center gap-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-800">
                    الاسم المدخل لا يطابق اسم الحساب ({profile.full_name})
                  </span>
                </div>
              )}
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">تاريخ الميلاد *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="text-right"
                disabled={loading}
              />
            </div>

            {/* Place of Birth */}
            <div className="space-y-2">
              <Label htmlFor="placeOfBirth">مكان الميلاد</Label>
              <Input
                id="placeOfBirth"
                type="text"
                value={placeOfBirth}
                onChange={(e) => setPlaceOfBirth(e.target.value)}
                placeholder="مكان الميلاد (اختياري)"
                className="text-right"
                disabled={loading}
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">العنوان</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="عنوان الإقامة (اختياري)"
                rows={2}
                className="text-right"
                disabled={loading}
              />
            </div>
          </div>

          {/* Front Image Upload */}
          <div className="space-y-2">
            <Label>صورة الهوية - الوجه الأمامي</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              {frontImagePreview ? (
                <div className="space-y-4">
                  <img 
                    src={frontImagePreview} 
                    alt="معاينة الوجه الأمامي" 
                    className="max-h-48 mx-auto object-contain rounded-md border"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFrontImage(null);
                      setFrontImagePreview(null);
                    }}
                    disabled={loading}
                  >
                    إزالة الصورة
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">انقر لاختيار صورة الوجه الأمامي للهوية</p>
                    <p className="text-xs text-gray-400">JPG, PNG - أقل من 5MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'front')}
                    className="hidden"
                    id="frontImage"
                    disabled={loading}
                  />
                  <Label htmlFor="frontImage" className="cursor-pointer">
                    <Button type="button" variant="outline" className="pointer-events-none" disabled={loading}>
                      <Upload className="h-4 w-4 mr-2" />
                      اختيار صورة
                    </Button>
                  </Label>
                </div>
              )}
            </div>
          </div>

          {/* Back Image Upload */}
          <div className="space-y-2">
            <Label>صورة الهوية - الوجه الخلفي</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              {backImagePreview ? (
                <div className="space-y-4">
                  <img 
                    src={backImagePreview} 
                    alt="معاينة الوجه الخلفي" 
                    className="max-h-48 mx-auto object-contain rounded-md border"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBackImage(null);
                      setBackImagePreview(null);
                    }}
                    disabled={loading}
                  >
                    إزالة الصورة
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">انقر لاختيار صورة الوجه الخلفي للهوية</p>
                    <p className="text-xs text-gray-400">JPG, PNG - أقل من 5MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'back')}
                    className="hidden"
                    id="backImage"
                    disabled={loading}
                  />
                  <Label htmlFor="backImage" className="cursor-pointer">
                    <Button type="button" variant="outline" className="pointer-events-none" disabled={loading}>
                      <Upload className="h-4 w-4 mr-2" />
                      اختيار صورة
                    </Button>
                  </Label>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || (!nationalId.trim()) || (!fullNameOnId.trim()) || (!dateOfBirth.trim()) || (!frontImage && !backImage)}
          >
            {loading ? 'جاري الإرسال...' : 'إرسال طلب التحقق'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};