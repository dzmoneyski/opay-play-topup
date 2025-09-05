import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
        _card_code: cardCode.trim(),
        _user_id: user.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string; amount?: number };

      if (result.success) {
        toast({
          title: "نجح العملية",
          description: `${result.message} - ${result.amount} دج`,
        });
        return true;
      } else {
        toast({
          title: "خطأ",
          description: result.error,
          variant: "destructive",
        });
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