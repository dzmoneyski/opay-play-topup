import React from 'react';
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
  Shield,
  ArrowLeft,
  Copy
} from 'lucide-react';
import { IdentityVerification } from '@/components/IdentityVerification';

const AccountActivation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, loading, submitPhoneVerification, verifyPhoneCode } = useProfile();
  
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  
  // Phone verification states
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [verificationCode, setVerificationCode] = React.useState('');
  const [showCodeInput, setShowCodeInput] = React.useState(false);
  const [sentCode, setSentCode] = React.useState('');

  React.useEffect(() => {
    console.log('Profile data:', profile);
    console.log('Loading state:', loading);
    if (profile && profile.is_account_activated) {
      console.log('Account is activated, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  React.useEffect(() => {
    console.log('Profile changed:', profile);
    if (profile) {
      console.log('Phone verified:', profile.is_phone_verified);
      console.log('Identity verified:', profile.is_identity_verified);
      console.log('Current step will be:', profile.is_phone_verified ? 2 : 1);
      
      if (profile.is_phone_verified) {
        setCurrentStep(2);
      }
      if (profile.phone) {
        setPhoneNumber(profile.phone);
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
      setSentCode(code || '');
      toast({
        title: "تم إرسال الرمز",
        description: `تم إرسال رمز التفعيل إلى ${phoneNumber}`,
      });
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

  console.log('Rendering AccountActivation component');
  console.log('Current loading state:', loading);
  console.log('Current profile:', profile);
  console.log('Current step:', currentStep);

  if (loading) {
    console.log('Still loading, showing loading screen');
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  console.log('Profile loaded, rendering main content');
  console.log('Should show phone verification:', !profile?.is_phone_verified);
  console.log('Should show identity verification:', profile?.is_phone_verified && !profile?.is_identity_verified);

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-gradient-glass"></div>
      
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="w-12 h-12 p-0 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/20 transition-all group"
        >
          <ArrowLeft className="h-5 w-5 text-white group-hover:text-white transition-colors" />
        </Button>
      </div>
      
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
                  {sentCode && (
                    <div className="bg-gradient-primary/20 border border-primary/30 rounded-xl p-4 space-y-3">
                      <p className="text-white/90 text-sm text-center">رمز التفعيل الخاص بك:</p>
                      <div className="flex items-center justify-center gap-2 bg-white/10 rounded-lg p-4">
                        <code className="text-3xl font-bold text-white tracking-widest">
                          {sentCode}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(sentCode);
                            toast({
                              title: "تم النسخ",
                              description: "تم نسخ الرمز بنجاح",
                            });
                          }}
                          className="text-white/80 hover:text-white hover:bg-white/10"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-white/70 text-xs text-center">
                        انسخ هذا الرمز وأدخله في الحقل أدناه
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-white/90">رمز التفعيل</Label>
                    <Input
                      id="code"
                      type="text"
                      placeholder="xxxxxx"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-primary focus:bg-white/20 text-center text-xl tracking-widest"
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
          <div className="animate-slide-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
            <IdentityVerification 
              onSuccess={() => {
                toast({
                  title: "تم إرسال طلب التفعيل بنجاح",
                  description: "سيتم مراجعة طلبك خلال 24 ساعة وإشعارك بالنتيجة",
                });
              }} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountActivation;