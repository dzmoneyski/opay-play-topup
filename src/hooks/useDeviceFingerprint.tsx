import { useState, useEffect } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export const useDeviceFingerprint = () => {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setFingerprint(result.visitorId);
      } catch (error) {
        console.error('Error getting fingerprint:', error);
        // Fallback to a simple fingerprint
        const fallback = btoa(
          navigator.userAgent + 
          screen.width + 
          screen.height + 
          new Date().getTimezoneOffset()
        );
        setFingerprint(fallback);
      } finally {
        setLoading(false);
      }
    };

    getFingerprint();
  }, []);

  return { fingerprint, loading };
};

export const getDeviceFingerprint = async (): Promise<string> => {
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  } catch (error) {
    // Fallback
    return btoa(
      navigator.userAgent + 
      screen.width + 
      screen.height + 
      new Date().getTimezoneOffset()
    );
  }
};
