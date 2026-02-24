import { supabase } from '@/integrations/supabase/client';

export const sendTelegramNotification = async (type: string, record: Record<string, any>) => {
  try {
    await supabase.functions.invoke('telegram-notify', {
      body: { type, record }
    });
  } catch (error) {
    // Silent fail - notifications should never block user operations
    console.error('Telegram notification failed:', error);
  }
};
