import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.cebeaa263b1d4bcb98d5016f409c243d',
  appName: 'OpaY',
  webDir: 'dist',
  server: {
    url: 'https://cebeaa26-3b1d-4bcb-98d5-016f409c243d.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
