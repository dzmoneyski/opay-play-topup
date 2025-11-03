import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export type PermissionType = 'notifications' | 'camera' | 'microphone' | 'geolocation';

interface PermissionStatus {
  notifications: PermissionState | 'unknown';
  camera: PermissionState | 'unknown';
  microphone: PermissionState | 'unknown';
  geolocation: PermissionState | 'unknown';
}

export const usePWAPermissions = () => {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<PermissionStatus>({
    notifications: 'unknown',
    camera: 'unknown',
    microphone: 'unknown',
    geolocation: 'unknown',
  });

  // Check current permission status
  const checkPermissions = async () => {
    try {
      // Check notifications
      if ('Notification' in window) {
        setPermissions(prev => ({
          ...prev,
          notifications: Notification.permission as PermissionState,
        }));
      }

      // Check camera
      if ('permissions' in navigator) {
        try {
          const cameraStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
          setPermissions(prev => ({ ...prev, camera: cameraStatus.state }));
        } catch (e) {
          console.log('Camera permission check not supported');
        }

        // Check microphone
        try {
          const micStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setPermissions(prev => ({ ...prev, microphone: micStatus.state }));
        } catch (e) {
          console.log('Microphone permission check not supported');
        }

        // Check geolocation
        try {
          const geoStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          setPermissions(prev => ({ ...prev, geolocation: geoStatus.state }));
        } catch (e) {
          console.log('Geolocation permission check not supported');
        }
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    try {
      if (!('Notification' in window)) {
        toast({
          title: 'غير مدعوم',
          description: 'المتصفح الخاص بك لا يدعم الإشعارات',
          variant: 'destructive',
        });
        return false;
      }

      const permission = await Notification.requestPermission();
      setPermissions(prev => ({ ...prev, notifications: permission as PermissionState }));

      if (permission === 'granted') {
        toast({
          title: '✅ تم تفعيل الإشعارات',
          description: 'سنرسل لك إشعارات بالمعاملات المهمة',
        });

        // Register for push notifications
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          try {
            const registration = await navigator.serviceWorker.ready;
            await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(
                'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
              ),
            });
          } catch (error) {
            console.error('Error subscribing to push:', error);
          }
        }

        return true;
      } else {
        toast({
          title: 'تم الرفض',
          description: 'يمكنك تفعيل الإشعارات لاحقاً من إعدادات المتصفح',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  // Request camera permission
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissions(prev => ({ ...prev, camera: 'granted' }));
      toast({
        title: '✅ تم تفعيل الكاميرا',
        description: 'يمكنك الآن مسح رموز QR',
      });
      return true;
    } catch (error) {
      setPermissions(prev => ({ ...prev, camera: 'denied' }));
      toast({
        title: 'تم الرفض',
        description: 'يمكنك تفعيل الكاميرا لاحقاً من إعدادات المتصفح',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Request geolocation permission
  const requestGeolocationPermission = async () => {
    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setPermissions(prev => ({ ...prev, geolocation: 'granted' }));
          toast({
            title: '✅ تم تفعيل الموقع',
            description: 'يمكننا الآن مساعدتك في إيجاد أقرب كشك',
          });
          resolve(true);
        },
        () => {
          setPermissions(prev => ({ ...prev, geolocation: 'denied' }));
          toast({
            title: 'تم الرفض',
            description: 'يمكنك تفعيل الموقع لاحقاً من إعدادات المتصفح',
            variant: 'destructive',
          });
          resolve(false);
        }
      );
    });
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  return {
    permissions,
    requestNotificationPermission,
    requestCameraPermission,
    requestGeolocationPermission,
    checkPermissions,
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
