import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PaymentWallets {
  baridimob: string;
  ccp: string;
  edahabiya: string;
}

export const usePaymentWallets = () => {
  const [wallets, setWallets] = useState<PaymentWallets | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchWallets = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'payment_wallets')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        setWallets(data.setting_value as unknown as PaymentWallets);
      } else {
        // Set default wallet values if no data exists
        setWallets({
          baridimob: "0551234567",
          ccp: "002345678910",
          edahabiya: "0661234567"
        });
      }
    } catch (error) {
      console.error('Error fetching payment wallets:', error);
      // Set default values even on error to prevent UI issues
      setWallets({
        baridimob: "0551234567",
        ccp: "002345678910", 
        edahabiya: "0661234567"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateWallets = async (newWallets: PaymentWallets) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({ setting_value: newWallets as any })
        .eq('setting_key', 'payment_wallets');

      if (error) throw error;

      setWallets(newWallets);
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم تحديث إعدادات محافظ الإيداع"
      });
    } catch (error) {
      console.error('Error updating payment wallets:', error);
      toast({
        title: "خطأ في الحفظ",
        description: "فشل في تحديث إعدادات محافظ الإيداع",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  return { wallets, loading, saving, updateWallets, refetch: fetchWallets };
};