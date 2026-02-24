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

      // Get user phone for notifications
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('user_id', user.id)
        .maybeSingle();

      const userPhone = profile?.phone || 'غير معروف';

      // Check if this card is from the compromised batch (created 2025-12-06)
      const { data: cardInfo } = await supabase
        .from('gift_cards')
        .select('created_at, card_code, amount')
        .eq('card_code', cardCode.trim())
        .maybeSingle();

      if (cardInfo) {
        const cardDate = new Date(cardInfo.created_at).toISOString().split('T')[0];
        if (cardDate === '2025-12-06') {
          sendTelegramNotification('compromised_card_alert', {
            card_code: cardCode.trim(),
            amount: cardInfo.amount,
            user_id: user.id,
            user_phone: userPhone,
            success: result.success,
          });
        }
      }

      if (result.success) {
        toast({
          title: "نجح العملية",
          description: `${result.message} - ${result.amount} دج`,
        });

        sendTelegramNotification('gift_card_redeemed', {
          amount: result.amount,
          user_id: user.id,
          user_phone: userPhone,
          card_code: cardCode.trim(),
        });

        return true;
      } else {
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