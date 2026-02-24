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
      const normalizedCardCode = cardCode.replace(/[^0-9]/g, '');

      const { data, error } = await supabase.rpc('redeem_gift_card', {
        _card_code: normalizedCardCode
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

      // Check if this card is from the compromised batch using secure DB function
      const cleanCardCode = normalizedCardCode;
      const { data: cardCheckData } = await supabase.rpc('check_compromised_card', {
        _card_code: cleanCardCode
      });

      const cardCheck = cardCheckData as { found: boolean; is_compromised?: boolean; amount?: number; card_code?: string } | null;

      if (cardCheck?.found && cardCheck?.is_compromised) {
        await sendTelegramNotification('compromised_card_alert', {
          card_code: cleanCardCode,
          amount: cardCheck.amount,
          user_id: user.id,
          user_phone: userPhone,
          success: result.success,
        });
      }

      if (result.success) {
        toast({
          title: "نجح العملية",
          description: `${result.message} - ${result.amount} دج`,
        });

        await sendTelegramNotification('gift_card_redeemed', {
          amount: result.amount,
          user_id: user.id,
          user_phone: userPhone,
          card_code: cleanCardCode,
        });

        return true;
      } else {
        if (result.locked_until && result.remaining_seconds) {
          const hours = Math.floor(result.remaining_seconds / 3600);
          const minutes = Math.floor((result.remaining_seconds % 3600) / 60);

          await sendTelegramNotification('fraud_attempt', {
            attempt_type: 'gift_card_redeem_locked',
            user_id: user.id,
            details: {
              alert: 'تم توقيف محاولات تفعيل البطاقات بسبب تكرار المحاولات',
              card_code: cleanCardCode,
              user_phone: userPhone,
              remaining_seconds: result.remaining_seconds,
            },
          });

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