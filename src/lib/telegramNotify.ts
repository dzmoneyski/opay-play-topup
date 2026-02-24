import { supabase } from '@/integrations/supabase/client';

export const sendTelegramNotification = async (type: string, record: Record<string, any>) => {
  try {
    const { error } = await supabase.functions.invoke('telegram-notify', {
      body: { type, record }
    });

    if (error) {
      console.error('Telegram notification invoke error:', error);
      return false;
    }

    return true;
  } catch (error) {
    // Silent fail - notifications should never block user operations
    console.error('Telegram notification failed:', error);
    return false;
  }
};
