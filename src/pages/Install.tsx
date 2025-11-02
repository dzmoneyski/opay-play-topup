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
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 bg-gradient-primary rounded-full shadow-elevated p-4 flex items-center justify-center">
              <img src={opayLogo} alt="OpaY Logo" className="w-full h-full object-contain rounded-full" />
            </div>
            <CardTitle className="text-3xl mb-2">ثبت تطبيق OpaY</CardTitle>
            <CardDescription className="text-base">
              احصل على تجربة أفضل مع تطبيقنا المثبت
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isInstallable ? (
              <Button 
                onClick={handleInstallClick} 
                size="lg" 
                className="w-full text-lg"
              >
                <Download className="ml-2" />
                تثبيت التطبيق الآن
              </Button>
            ) : (
              <div className="text-center space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <Smartphone className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    لتثبيت التطبيق على هاتفك:
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-lg">خطوات التثبيت اليدوي:</h3>
              
              <div className="space-y-3">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">📱 على iPhone/iPad:</h4>
                  <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                    <li>اضغط على زر "مشاركة" <span className="inline-block">⬆️</span></li>
                    <li>اختر "إضافة إلى الشاشة الرئيسية"</li>
                    <li>اضغط "إضافة"</li>
                  </ol>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">📱 على Android:</h4>
                  <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                    <li>اضغط على قائمة المتصفح (⋮)</li>
                    <li>اختر "إضافة إلى الشاشة الرئيسية"</li>
                    <li>اضغط "تثبيت"</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 p-4 rounded-lg space-y-2">
              <h4 className="font-medium">✨ مميزات التطبيق:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• الوصول السريع من شاشتك الرئيسية</li>
                <li>• يعمل بدون إنترنت</li>
                <li>• تحميل أسرع</li>
                <li>• تجربة أفضل مثل التطبيقات الأصلية</li>
              </ul>
            </div>

            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="w-full"
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