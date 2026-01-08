import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Phone,
  KeyRound,
  Loader2
} from 'lucide-react';
import opayGatewayLogo from '@/assets/opay-final-logo.png';

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, user } = useAuth();
  
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('signin');
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = React.useState('');
  const [isSendingReset, setIsSendingReset] = React.useState(false);
  
  // Password reset states - check URL immediately on init
  const [isResetMode, setIsResetMode] = React.useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('reset') === 'true';
  });
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmNewPassword, setConfirmNewPassword] = React.useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);
  const [resetError, setResetError] = React.useState<string | null>(null);

  // Form states
  const [signInData, setSignInData] = React.useState({
    email: '',
    password: ''
  });

  const [signUpData, setSignUpData] = React.useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });

  // Check for reset mode and errors in URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const isReset = params.get('reset') === 'true';
    
    // Check for errors in query params (e.g., ?error=access_denied&error_code=otp_expired)
    const errorInParams = params.get('error');
    const errorCodeInParams = params.get('error_code');
    const errorDescInParams = params.get('error_description');
    
    // Check for errors in hash (e.g., #error=access_denied&error_code=otp_expired)
    let errorCode = errorCodeInParams;
    let errorDescription = errorDescInParams;
    
    if (hash && hash.includes('error')) {
      const hashParams = new URLSearchParams(hash.substring(1));
      errorCode = errorCode || hashParams.get('error_code');
      errorDescription = errorDescription || hashParams.get('error_description');
    }
    
    // Handle any error found
    if (errorInParams || (hash && hash.includes('error'))) {
      if (errorCode === 'otp_expired' || errorCode === 'otp_not_found' || 
          errorDescription?.includes('expired') || errorDescription?.includes('invalid')) {
        setResetError('انتهت صلاحية رابط إعادة التعيين أو أنه غير صالح. يرجى طلب رابط جديد.');
        toast({
          title: "رمز غير صالح",
          description: "رابط إعادة تعيين كلمة المرور منتهي الصلاحية أو غير صالح. يرجى طلب رابط جديد.",
          variant: "destructive"
        });
      } else if (errorDescription) {
        setResetError(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
      } else {
        setResetError('حدث خطأ أثناء إعادة تعيين كلمة المرور. يرجى المحاولة مرة أخرى.');
      }
      // Clear the URL
      window.history.replaceState(null, '', '/auth');
    } else if (isReset) {
      setIsResetMode(true);
    }
  }, [toast]);

  // Redirect if already authenticated (but not in reset mode)
  React.useEffect(() => {
    if (user && !isResetMode) {
      navigate('/dashboard');
    }

    // Check for referral code in URL
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      setSignUpData(prev => ({ ...prev, referralCode: refCode }));
      setActiveTab('signup'); // Switch to signup mode
    }
  }, [user, navigate, isResetMode]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!signInData.email || !signInData.password) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى ملأ جميع الحقول المطلوبة",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signIn(signInData.email, signInData.password);

    if (error) {
      let errorMessage = "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى";
      
      if (error.message === 'Invalid login credentials') {
        errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
      } else if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
        errorMessage = "يرجى تأكيد بريدك الإلكتروني أولاً. تفقد صندوق الوارد الخاص بك";
      }
      
      toast({
        title: "خطأ في تسجيل الدخول",
        description: errorMessage,
        variant: "destructive"
      });
    } else {
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحباً بك في محفظة OpaY",
      });
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!signUpData.fullName || !signUpData.phone || !signUpData.email || !signUpData.password || !signUpData.confirmPassword) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى ملأ جميع الحقول المطلوبة",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    // التحقق من صحة رقم الهاتف الجزائري
    const phoneRegex = /^(05|06|07)[0-9]{8}$/;
    if (!phoneRegex.test(signUpData.phone)) {
      toast({
        title: "رقم الهاتف غير صحيح",
        description: "يرجى إدخال رقم هاتف جزائري صحيح يبدأ بـ 05 أو 06 أو 07",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      toast({
        title: "خطأ في كلمة المرور",
        description: "كلمة المرور وتأكيد كلمة المرور غير متطابقتين",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    if (signUpData.password.length < 6) {
      toast({
        title: "كلمة المرور ضعيفة",
        description: "يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(signUpData.email, signUpData.password, signUpData.fullName, signUpData.phone, signUpData.referralCode);

    if (error) {
      if (error.message.includes('User already registered')) {
        toast({
          title: "الحساب موجود مسبقاً",
          description: "هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول",
          variant: "destructive"
        });
        setActiveTab('signin');
      } else {
        toast({
          title: "خطأ في إنشاء الحساب",
          description: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "تم إنشاء الحساب بنجاح",
        description: "يرجى تفعيل حسابك من خلال الرابط المرسل إلى بريدك الإلكتروني",
      });
      setActiveTab('signin');
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال البريد الإلكتروني",
        variant: "destructive"
      });
      return;
    }

    setIsSendingReset(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });

    if (error) {
      let errorMessage = "حدث خطأ أثناء إرسال رابط إعادة التعيين. يرجى المحاولة مرة أخرى";
      
      // Rate limit error
      if (error.message.includes('rate_limit') || error.message.includes('after') || error.status === 429) {
        errorMessage = "تم إرسال الرابط بالفعل! يرجى الانتظار قليلاً قبل طلب رابط جديد وتفقد صندوق الوارد أو مجلد الـ Spam";
      } else if (error.message.includes('User not found')) {
        errorMessage = "البريد الإلكتروني غير مسجل في النظام";
      }
      
      toast({
        title: "تنبيه",
        description: errorMessage,
        variant: "destructive"
      });
    } else {
      toast({
        title: "تم الإرسال بنجاح",
        description: "تم إرسال رابط إعادة تعيين كلمة المرور. تفقد بريدك الإلكتروني ومجلد الـ Spam",
      });
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    }

    setIsSendingReset(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmNewPassword) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "خطأ",
        description: "كلمة المرور وتأكيدها غير متطابقتين",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "كلمة المرور ضعيفة",
        description: "يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث كلمة المرور. يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } else {
      toast({
        title: "تم بنجاح",
        description: "تم تحديث كلمة المرور بنجاح",
      });
      setIsResetMode(false);
      setNewPassword('');
      setConfirmNewPassword('');
      // Clear URL params
      window.history.replaceState(null, '', '/auth');
      navigate('/dashboard');
    }

    setIsUpdatingPassword(false);
  };

  // Show password reset form
  if (isResetMode && !resetError) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4" dir="rtl">
        <div className="absolute inset-0 bg-gradient-glass"></div>
        
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8 animate-slide-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20 shadow-glow mb-6 animate-glow-pulse">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">تعيين كلمة مرور جديدة</h1>
            <p className="text-white/80">أدخل كلمة المرور الجديدة لحسابك</p>
          </div>

          <Card className="bg-gradient-glass backdrop-blur-xl border border-white/10 shadow-elevated animate-slide-up">
            <CardContent className="pt-6">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-white/90">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3 h-4 w-4 text-white/60" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="أدخل كلمة المرور الجديدة"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-primary focus:bg-white/20"
                      disabled={isUpdatingPassword}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password" className="text-white/90">تأكيد كلمة المرور</Label>
                  <div className="relative">
                    <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-white/60" />
                    <Input
                      id="confirm-new-password"
                      type="password"
                      placeholder="أعد إدخال كلمة المرور"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-primary focus:bg-white/20"
                      disabled={isUpdatingPassword}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:opacity-90 text-white font-semibold py-3 shadow-soft"
                  disabled={isUpdatingPassword}
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      جاري التحديث...
                    </>
                  ) : (
                    <>
                      تحديث كلمة المرور
                      <ArrowRight className="mr-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show error page if reset link expired
  if (resetError) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4" dir="rtl">
        <div className="absolute inset-0 bg-gradient-glass"></div>
        
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8 animate-slide-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/20 border border-destructive/30 mb-6">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">انتهت صلاحية الرابط</h1>
            <p className="text-white/80">{resetError}</p>
          </div>

          <Card className="bg-gradient-glass backdrop-blur-xl border border-white/10 shadow-elevated animate-slide-up">
            <CardContent className="pt-6 space-y-4">
              <p className="text-white/70 text-center text-sm">
                روابط إعادة تعيين كلمة المرور صالحة لمدة ساعة واحدة فقط. يرجى طلب رابط جديد.
              </p>
              
              <Button 
                onClick={() => {
                  setResetError(null);
                  setShowForgotPassword(true);
                  window.history.replaceState(null, '', '/auth');
                }}
                className="w-full bg-gradient-primary hover:opacity-90 text-white font-semibold py-3"
              >
                <Mail className="h-4 w-4 ml-2" />
                طلب رابط جديد
              </Button>

              <Button 
                variant="ghost"
                onClick={() => {
                  setResetError(null);
                  window.history.replaceState(null, '', '/auth');
                }}
                className="w-full text-white/70 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 ml-2" />
                العودة لتسجيل الدخول
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
      
      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20 shadow-glow mb-6 animate-glow-pulse">
            <img src={opayGatewayLogo} alt="OpaY gateway logo" className="w-14 h-14 rounded-full object-cover" loading="lazy" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">OpaY الجزائر</h1>
          <p className="text-white/80">محفظتك الرقمية المتطورة</p>
        </div>

        {/* Auth Card */}
        <Card className="bg-gradient-glass backdrop-blur-xl border border-white/10 shadow-elevated animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-white text-xl">
              {activeTab === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 bg-white/10 border border-white/20">
                <TabsTrigger value="signin" className="text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/20">
                  تسجيل الدخول
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/20">
                  حساب جديد
                </TabsTrigger>
              </TabsList>

              {/* Sign In Form */}
              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-white/90">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-3 h-4 w-4 text-white/60" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="أدخل بريدك الإلكتروني"
                        value={signInData.email}
                        onChange={(e) => setSignInData(prev => ({...prev, email: e.target.value}))}
                        className="pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-primary focus:bg-white/20"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-white/90">كلمة المرور</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-3 h-4 w-4 text-white/60" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="أدخل كلمة المرور"
                        value={signInData.password}
                        onChange={(e) => setSignInData(prev => ({...prev, password: e.target.value}))}
                        className="pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-primary focus:bg-white/20"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:opacity-90 text-white font-semibold py-3 shadow-soft"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      "جاري تسجيل الدخول..."
                    ) : (
                      <>
                        تسجيل الدخول
                        <ArrowRight className="mr-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  {/* Forgot Password Link */}
                  <div className="text-center pt-2">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-white/70 hover:text-white text-sm p-0 h-auto"
                    >
                      <KeyRound className="h-4 w-4 ml-1" />
                      نسيت كلمة المرور؟
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* Sign Up Form */}
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-white/90">الاسم الكامل</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-3 h-4 w-4 text-white/60" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="أدخل اسمك الكامل"
                        value={signUpData.fullName}
                        onChange={(e) => setSignUpData(prev => ({...prev, fullName: e.target.value}))}
                        className="pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-primary focus:bg-white/20"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone" className="text-white/90">رقم الهاتف</Label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-3 h-4 w-4 text-white/60" />
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="0555123456"
                        value={signUpData.phone}
                        onChange={(e) => {
                          // السماح فقط بالأرقام
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          if (value.length <= 10) {
                            setSignUpData(prev => ({...prev, phone: value}));
                          }
                        }}
                        className="pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-primary focus:bg-white/20"
                        disabled={isLoading}
                        maxLength={10}
                      />
                    </div>
                    <p className="text-xs text-white/60">مثال: 0555123456 (يجب أن يبدأ بـ 05 أو 06 أو 07)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-white/90">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-3 h-4 w-4 text-white/60" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="أدخل بريدك الإلكتروني"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData(prev => ({...prev, email: e.target.value}))}
                        className="pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-primary focus:bg-white/20"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-white/90">كلمة المرور</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-3 h-4 w-4 text-white/60" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="أدخل كلمة المرور"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData(prev => ({...prev, password: e.target.value}))}
                        className="pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-primary focus:bg-white/20"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-white/90">تأكيد كلمة المرور</Label>
                    <div className="relative">
                      <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-white/60" />
                      <Input
                        id="signup-confirm-password"
                        type="password"
                        placeholder="أعد إدخال كلمة المرور"
                        value={signUpData.confirmPassword}
                        onChange={(e) => setSignUpData(prev => ({...prev, confirmPassword: e.target.value}))}
                        className="pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-primary focus:bg-white/20"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-referral" className="text-white/90">كود الإحالة (اختياري)</Label>
                    <Input
                      id="signup-referral"
                      type="text"
                      placeholder="REF12345"
                      value={signUpData.referralCode}
                      onChange={(e) => setSignUpData(prev => ({...prev, referralCode: e.target.value.toUpperCase()}))}
                      className="text-center font-mono bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-primary focus:bg-white/20"
                      disabled={isLoading}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-secondary hover:opacity-90 text-white font-semibold py-3 shadow-soft"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      "جاري إنشاء الحساب..."
                    ) : (
                      <>
                        إنشاء حساب جديد
                        <ArrowRight className="mr-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

          </CardContent>
        </Card>

        {/* Back to Auth */}
        <div className="text-center mt-6 animate-slide-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/auth')}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            العودة إلى صفحة التسجيل
          </Button>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md bg-background" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              استعادة كلمة المرور
            </DialogTitle>
            <DialogDescription>
              أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="أدخل بريدك الإلكتروني"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="pr-10"
                  disabled={isSendingReset}
                />
              </div>
            </div>

            <Button 
              onClick={handleForgotPassword}
              className="w-full"
              disabled={isSendingReset}
            >
              {isSendingReset ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 ml-2" />
                  إرسال رابط الاستعادة
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;