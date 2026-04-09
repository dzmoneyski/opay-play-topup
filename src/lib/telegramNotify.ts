import { supabase } from '@/integrations/supabase/client';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const sendTelegramNotification = async (type: string, record: Record<string, any>): Promise<boolean> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { error } = await supabase.functions.invoke('telegram-notify', {
        body: { type, record }
      });

      if (error) {
        console.error(`Telegram notification attempt ${attempt}/${MAX_RETRIES} failed:`, error);
        if (attempt < MAX_RETRIES) {
          await delay(RETRY_DELAY_MS * attempt);
          continue;
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Telegram notification attempt ${attempt}/${MAX_RETRIES} error:`, error);
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * attempt);
        continue;
      }
      return false;
    }
  }
  return false;
};
