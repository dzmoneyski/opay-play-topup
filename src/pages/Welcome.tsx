import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Smartphone, CreditCard, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Welcome = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const slides = [
    {
      icon: <Smartphone className="w-16 h-16 text-primary mb-4" />,
      title: "مرحباً بك في OpaY الجزائر",
      description: "محفظتك الرقمية الآمنة والسهلة للدفع والتحويل بالدينار الجزائري",
      features: ["محفظة إلكترونية آمنة", "تحويلات فورية", "شحن وسحب سهل"]
    },
    {
      icon: <CreditCard className="w-16 h-16 text-primary mb-4" />,
      title: "بطاقات رقمية متنوعة",
      description: "اشترِ بطاقات Google Play، Steam، Netflix وأكثر من كشكك المحلي",
      features: ["Google Play", "Steam", "Netflix وبطاقات أخرى"]
    },
    {
      icon: <CheckCircle className="w-16 h-16 text-primary mb-4" />,
      title: "آمن ومضمون",
      description: "تطبيق محمي بأحدث تقنيات الأمان مع تحقق الهوية",
      features: ["تشفير متقدم", "تحقق الهوية", "حماية الأموال"]
    }
  ];

  useEffect(() => {
    if (loading) return; // انتظر حالة المصادقة
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');

    if (hasSeenWelcome) {
      navigate(user ? '/' : '/auth');
      return;
    }

    // إن كان المستخدم مسجلاً الدخول ووصل هنا، أعده للصفحة الرئيسية
    if (user) {
      navigate('/', { replace: true });
    }
  }, [navigate, user, loading]);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // حفظ أن المستخدم شاهد المقدمة
      localStorage.setItem('hasSeenWelcome', 'true');
      navigate(user ? '/' : '/auth');
    }
  };

  const handleSkip = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    navigate('/auth');
  };

  const currentSlideData = slides[currentSlide];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto">
        {/* شاشة المقدمة */}
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center">
              {currentSlideData.icon}
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
              {currentSlideData.title}
            </CardTitle>
            <CardDescription className="text-gray-600 text-base leading-relaxed">
              {currentSlideData.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* المميزات */}
            <div className="space-y-3">
              {currentSlideData.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            {/* مؤشر الشرائح */}
            <div className="flex justify-center gap-2 py-4">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentSlide ? 'bg-primary' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* الأزرار */}
            <div className="flex justify-between gap-4">
              <Button 
                variant="outline" 
                onClick={handleSkip}
                className="flex-1"
              >
                تخطي
              </Button>
              
              <Button 
                onClick={handleNext}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {currentSlide === slides.length - 1 ? 'ابدأ الآن' : 'التالي'}
                <ArrowRight className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* معلومات إضافية */}
        <div className="text-center mt-6 text-white/70 text-sm">
          <p>تطبيق آمن ومرخص • خدمة عملاء 24/7</p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;