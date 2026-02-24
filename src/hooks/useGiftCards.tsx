import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { sendTelegramNotification } from '@/lib/telegramNotify';

export const useGiftCards = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const redeemGiftCard = async (cardCode: string) => {
    if (!user) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول أولاً",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('redeem_gift_card', {
        _card_code: cardCode.trim()
      });

      if (error) throw error;

      const result = data as { 
        success: boolean; 
        error?: string; 
        message?: string; 
        amount?: number;
        locked_until?: string;
        remaining_seconds?: number;
      };

      if (result.success) {
        toast({
          title: "نجح العملية",
          description: `${result.message} - ${result.amount} دج`,
        });

        // Send Telegram notification
        sendTelegramNotification('gift_card_redeemed', {
          amount: result.amount,
          user_id: user.id
        });

        return true;
      } else {
        // Handle lockout with countdown
        if (result.locked_until && result.remaining_seconds) {
          const hours = Math.floor(result.remaining_seconds / 3600);
          const minutes = Math.floor((result.remaining_seconds % 3600) / 60);
          toast({
            title: "تم إيقاف الحساب مؤقتاً",
            description: `${result.error}. الوقت المتبقي: ${hours}س ${minutes}د`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "خطأ",
            description: result.error,
            variant: "destructive",
          });
        }
        return false;
      }
    } catch (error) {
      console.error('Error redeeming gift card:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تعمير البطاقة",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    redeemGiftCard,
    loading
  };
};