import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import opayLogo from '@/assets/opay-final-logo.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">تم التثبيت بنجاح!</CardTitle>
            <CardDescription className="text-base">
              التطبيق الآن متاح على شاشتك الرئيسية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
            >
              الذهاب للصفحة الرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <Card className="mb-6 shadow-elevated">
          <CardHeader className="text-center">
            <div className="w-28 h-28 mx-auto mb-4 bg-gradient-primary rounded-full shadow-elevated p-2 flex items-center justify-center animate-float">
              <img src={opayLogo} alt="OpaY Logo" className="w-full h-full object-cover rounded-full" />
            </div>
            <CardTitle className="text-3xl mb-2">ثبت تطبيق OpaY</CardTitle>
            <CardDescription className="text-base">
              احصل على تجربة أفضل مع تطبيقنا المثبت
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* خانات التحميل للأندرويد والآيفون */}
            <div className="bg-gradient-primary p-6 rounded-2xl shadow-glow">
              <div className="text-center text-white space-y-5">
                <Download className="w-16 h-16 mx-auto animate-float" />
                <h3 className="text-2xl font-bold">حمل التطبيق الآن!</h3>
                <p className="text-white/90 text-sm">
                  اختر نظام التشغيل الخاص بجهازك
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* زر الأندرويد */}
                  <Button 
                    onClick={handleInstallClick} 
                    size="lg" 
                    className="w-full bg-white text-primary hover:bg-white/95 font-bold text-lg py-7 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Smartphone className="h-8 w-8 group-hover:scale-110 transition-transform" />
                      <span>Android</span>
                    </div>
                  </Button>

                  {/* زر الآيفون */}
                  <Button 
                    onClick={handleInstallClick} 
                    size="lg" 
                    className="w-full bg-white text-primary hover:bg-white/95 font-bold text-lg py-7 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Smartphone className="h-8 w-8 group-hover:scale-110 transition-transform" />
                      <span>iPhone</span>
                    </div>
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-lg text-center">أو اتبع الخطوات التالية:</h3>
              
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-xl border border-primary/20">
                  <h4 className="font-bold mb-2 flex items-center gap-2">
                    <span className="text-2xl">📱</span>
                    على iPhone/iPad:
                  </h4>
                  <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                    <li className="font-medium">اضغط على زر المشاركة <span className="inline-block text-xl">⬆️</span> في الأسفل</li>
                    <li className="font-medium">اختر "إضافة إلى الشاشة الرئيسية"</li>
                    <li className="font-medium">اضغط "إضافة" في الأعلى</li>
                  </ol>
                </div>

                <div className="bg-gradient-to-br from-success/5 to-success/10 p-4 rounded-xl border border-success/20">
                  <h4 className="font-bold mb-2 flex items-center gap-2">
                    <span className="text-2xl">📱</span>
                    على Android:
                  </h4>
                  <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                    <li className="font-medium">اضغط على قائمة المتصفح <span className="inline-block text-xl">⋮</span></li>
                    <li className="font-medium">اختر "إضافة إلى الشاشة الرئيسية"</li>
                    <li className="font-medium">اضغط "تثبيت" أو "إضافة"</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-gradient-gold/10 p-6 rounded-xl border-2 border-accent/30 space-y-3">
              <h4 className="font-bold text-lg flex items-center gap-2">
                <span className="text-2xl">✨</span>
                مميزات التطبيق المثبت:
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">وصول سريع من الشاشة الرئيسية</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">يعمل بدون إنترنت</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">تحميل فائق السرعة</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">تجربة كالتطبيقات الأصلية</span>
                </div>
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="w-full text-base py-5"
            >
              العودة للصفحة الرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Install;