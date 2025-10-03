import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight,
  CheckCircle,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import opayGatewayLogo from '@/assets/opay-gateway-logo.png';

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, user } = useAuth();
  
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('signin');

  // Form states
  const [signInData, setSignInData] = React.useState({
    email: '',
    password: ''
  });

  const [signUpData, setSignUpData] = React.useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Redirect if already authenticated
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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
      toast({
        title: "خطأ في تسجيل الدخول",
        description: error.message === 'Invalid login credentials' 
          ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
          : "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى",
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

    if (!signUpData.fullName || !signUpData.email || !signUpData.password || !signUpData.confirmPassword) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى ملأ جميع الحقول المطلوبة",
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

    const { error } = await signUp(signUpData.email, signUpData.password, signUpData.fullName);

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
            <img src={opayGatewayLogo} alt="OpaY gateway logo" className="w-9 h-9 object-contain" loading="lazy" />
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
    </div>
  );
};

export default Auth;