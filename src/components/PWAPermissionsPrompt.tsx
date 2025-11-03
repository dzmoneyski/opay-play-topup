import { useState, useEffect } from 'react';
import { Bell, Camera, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePWAPermissions } from '@/hooks/usePWAPermissions';

export const PWAPermissionsPrompt = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const {
    permissions,
    requestNotificationPermission,
    requestCameraPermission,
    requestGeolocationPermission,
  } = usePWAPermissions();

  const steps = [
    {
      icon: Bell,
      title: 'تلقي الإشعارات',
      description: 'احصل على تنبيهات فورية عند إتمام معاملاتك وتحديثات مهمة',
      action: requestNotificationPermission,
      permission: permissions.notifications,
    },
    {
      icon: Camera,
      title: 'الوصول للكاميرا',
      description: 'امسح رموز QR بسرعة وسهولة لإرسال واستقبال الأموال',
      action: requestCameraPermission,
      permission: permissions.camera,
    },
    {
      icon: MapPin,
      title: 'معرفة موقعك',
      description: 'اعثر على أقرب كشك لشحن رصيدك أو سحب الأموال',
      action: requestGeolocationPermission,
      permission: permissions.geolocation,
    },
  ];

  useEffect(() => {
    // Show prompt after 3 seconds if user hasn't granted all permissions
    const timer = setTimeout(() => {
      const allGranted = [
        permissions.notifications,
        permissions.camera,
        permissions.geolocation,
      ].every(p => p === 'granted');

      const hasSeenPrompt = localStorage.getItem('pwa-permissions-prompted');
      
      if (!allGranted && !hasSeenPrompt) {
        setIsVisible(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [permissions]);

  const handleNext = async () => {
    const step = steps[currentStep];
    if (step.permission !== 'granted') {
      await step.action();
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleSkip = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('pwa-permissions-prompted', 'true');
  };

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;
  const isGranted = currentStepData.permission === 'granted';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <Card className="w-full max-w-md relative animate-in slide-in-from-bottom">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-2"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>

        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{currentStepData.title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {currentStepData.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress indicator */}
          <div className="flex gap-2 justify-center">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-primary'
                    : index < currentStep
                    ? 'w-1.5 bg-primary'
                    : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {isGranted ? (
              <Button onClick={handleNext} className="w-full">
                {currentStep < steps.length - 1 ? 'التالي' : 'إنهاء'}
              </Button>
            ) : (
              <>
                <Button onClick={handleNext} className="w-full">
                  {currentStep < steps.length - 1 ? 'السماح والمتابعة' : 'السماح والإنهاء'}
                </Button>
                <Button onClick={handleSkip} variant="ghost" className="w-full">
                  تخطي
                </Button>
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            يمكنك تغيير هذه الأذونات في أي وقت من إعدادات المتصفح
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
