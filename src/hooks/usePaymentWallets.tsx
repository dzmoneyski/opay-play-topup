import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CCPAccount {
  accountNumber: string;
  key: string;
  holderName: string;
  location: string;
}

export interface PaymentWallets {
  baridimob: string;
  ccp: string | CCPAccount;
  edahabiya: string;
}

// Helper to check if CCP is an object with details
export const isCCPAccount = (ccp: string | CCPAccount): ccp is CCPAccount => {
  return typeof ccp === 'object' && ccp !== null && 'accountNumber' in ccp;
};

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
        // إذا لم توجد بيانات، استخدم القيم الافتراضية
        const defaultWallets: PaymentWallets = {
          baridimob: '',
          ccp: '',
          edahabiya: ''
        };
        setWallets(defaultWallets);
      }
    } catch (error) {
      console.error('Error fetching payment wallets:', error);
      // لا تظهر toast error للمستخدمين العاديين
      const defaultWallets: PaymentWallets = {
        baridimob: '',
        ccp: '',
        edahabiya: ''
      };
      setWallets(defaultWallets);
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
