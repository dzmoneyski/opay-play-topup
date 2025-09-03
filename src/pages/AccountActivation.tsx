import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { 
  Wallet, 
  Phone, 
  CreditCard, 
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Shield
} from 'lucide-react';

const AccountActivation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, loading, submitPhoneVerification, verifyPhoneCode, submitIdentityVerification } = useProfile();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Phone verification states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  
  // Identity verification states
  const [nationalId, setNationalId] = useState('');

  useEffect(() => {
    if (profile && profile.is_account_activated) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (profile) {
      if (profile.is_phone_verified) {
        setCurrentStep(2);
      }
      if (profile.phone) {
        setPhoneNumber(profile.phone);
      }
      if (profile.national_id) {
        setNationalId(profile.national_id);
      }
    }
  }, [profile]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم الهاتف",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const { error, verificationCode: code } = await submitPhoneVerification(phoneNumber);
    
    if (error) {
      toast({
        title: "خطأ في إرسال الرمز",
        description: error,
        variant: "destructive"
      });
    } else {
      setShowCodeInput(true);
      toast({
        title: "تم إرسال الرمز",
        description: `تم إرسال رمز التفعيل إلى ${phoneNumber}`,
      });
      // For demo purposes, show the code in toast (remove in production)
      setTimeout(() => {
        toast({
          title: "رمز التفعيل (للتجربة)",
          description: `الرمز: ${code}`,
        });
      }, 2000);
    }
    setIsLoading(false);
  };

  const handleCodeVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رمز التفعيل",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const { error } = await verifyPhoneCode(verificationCode);
    
    if (error) {
      toast({
        title: "خطأ في التحقق",
        description: error,
        variant: "destructive"
      });
    } else {
      toast({
        title: "تم تفعيل الهاتف بنجاح",
        description: "يمكنك الآن المتابعة لتفعيل الهوية",
      });
      setCurrentStep(2);
    }
    setIsLoading(false);
  };

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nationalId.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم البطاقة الوطنية",
        variant: "destructive"
      });
      return;
    }

    if (nationalId.length !== 18) {
      toast({
        title: "خطأ في البطاقة الوطنية",
        description: "يجب أن يكون رقم البطاقة الوطنية 18 رقماً",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const { error } = await submitIdentityVerification(nationalId);
    
    if (error) {
      toast({
        title: "خطأ في إرسال الطلب",
        description: error,
        variant: "destructive"
      });
    } else {
      toast({
        title: "تم إرسال طلب التفعيل",
        description: "سيتم مراجعة طلبك خلال 24 ساعة",
      });
    }
    setIsLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-gradient-glass"></div>
      
      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-primary rounded-3xl shadow-glow mb-6 animate-glow-pulse">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">تفعيل الحساب</h1>
          <p className="text-white/80">يرجى إكمال الخطوات التالية لتفعيل حسابك</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          <div className="flex items-center gap-4">
            {/* Step 1: Phone Verification */}
            <div className="flex items-center gap-2">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                ${profile?.is_phone_verified 
                  ? 'bg-gradient-secondary border-transparent text-white' 
                  : currentStep === 1 
                    ? 'border-white text-white bg-white/10' 
                    : 'border-white/30 text-white/50'
                }
              `}>
                {profile?.is_phone_verified ? <CheckCircle className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
              </div>
              <span className={`text-sm font-medium ${profile?.is_phone_verified ? 'text-white' : 'text-white/70'}`}>
                تفعيل الهاتف
              </span>
            </div>

            <div className="w-8 h-0.5 bg-white/30"></div>

            {/* Step 2: Identity Verification */}
            <div className="flex items-center gap-2">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                ${profile?.is_identity_verified 
                  ? 'bg-gradient-secondary border-transparent text-white' 
                  : currentStep === 2 
                    ? 'border-white text-white bg-white/10' 
                    : 'border-white/30 text-white/50'
                }
              `}>
                {profile?.is_identity_verified ? <CheckCircle className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
              </div>
              <span className={`text-sm font-medium ${profile?.is_identity_verified ? 'text-white' : 'text-white/70'}`}>
                تفعيل الهوية
              </span>
            </div>
          </div>
        </div>

        {/* Account Status */}
        {profile?.is_account_activated && (
          <Card className="bg-gradient-secondary/20 border-white/20 shadow-glow mb-6 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-16 w-16 text-white mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">الحساب مفعل بنجاح!</h3>
              <p className="text-white/80 mb-4">يمكنك الآن استخدام جميع خدمات التطبيق</p>
              <Button 
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-primary hover:opacity-90 text-white font-semibold"
              >
                الذهاب إلى لوحة التحكم
                <ArrowRight className="mr-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Phone Verification */}
        {!profile?.is_phone_verified && (
          <Card className="bg-gradient-glass backdrop-blur-xl border border-white/10 shadow-elevated mb-6 animate-slide-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <Phone className="h-6 w-6" />
                تفعيل رقم الهاتف
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showCodeInput ? (
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white/90">رقم الهاتف</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="05xxxxxxxx"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-primary focus:bg-white/20"
                      disabled={isLoading}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:opacity-90 text-white font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? "جاري الإرسال..." : "إرسال رمز التفعيل"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleCodeVerification} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-white/90">رمز التفعيل</Label>
                    <Input
                      id="code"
                      type="text"
                      placeholder="xxxxxx"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-primary focus:bg-white/20"
                      disabled={isLoading}
                      maxLength={6}
                    />
                    <p className="text-white/70 text-sm">
                      تم إرسال رمز التفعيل إلى {phoneNumber}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      type="button"
                      variant="ghost"
                      onClick={() => setShowCodeInput(false)}
                      className="flex-1 text-white/80 hover:text-white hover:bg-white/10"
                      disabled={isLoading}
                    >
                      تغيير الرقم
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-gradient-primary hover:opacity-90 text-white font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? "جاري التحقق..." : "تفعيل"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Identity Verification */}
        {profile?.is_phone_verified && !profile?.is_identity_verified && (
          <Card className="bg-gradient-glass backdrop-blur-xl border border-white/10 shadow-elevated mb-6 animate-slide-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <CreditCard className="h-6 w-6" />
                تفعيل البطاقة الوطنية
                {profile.identity_verification_status === 'pending' && (
                  <Badge className="bg-gradient-gold text-white border-0">
                    <Clock className="h-3 w-3 ml-1" />
                    قيد المراجعة
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.identity_verification_status === 'pending' ? (
                <div className="text-center py-8">
                  <Clock className="h-16 w-16 text-white/70 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">طلبك قيد المراجعة</h3>
                  <p className="text-white/80">
                    سيتم مراجعة طلب تفعيل البطاقة الوطنية خلال 24 ساعة
                  </p>
                </div>
              ) : (
                <form onSubmit={handleIdentitySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nationalId" className="text-white/90">رقم البطاقة الوطنية</Label>
                    <Input
                      id="nationalId"
                      type="text"
                      placeholder="xxxxxxxxxxxxxxxxxx"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-primary focus:bg-white/20"
                      disabled={isLoading}
                      maxLength={18}
                    />
                    <p className="text-white/70 text-sm">
                      يجب أن يكون رقم البطاقة الوطنية 18 رقماً
                    </p>
                  </div>
                  
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-white/70 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-white/80">
                        <p className="font-medium mb-1">معلومة مهمة:</p>
                        <p>سيتم مراجعة البطاقة الوطنية من قبل فريقنا للتأكد من صحة البيانات. هذه العملية قد تستغرق حتى 24 ساعة.</p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-secondary hover:opacity-90 text-white font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? "جاري الإرسال..." : "إرسال طلب التفعيل"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AccountActivation;