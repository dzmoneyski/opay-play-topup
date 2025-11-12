import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AliExpressSettings {
  exchangeRate: number;
  serviceFeePercentage: number;
  defaultShippingFee: number;
}

export const useAliExpressSettings = () => {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['aliexpress-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'aliexpress_exchange_rate',
          'aliexpress_service_fee_percentage',
          'aliexpress_default_shipping_fee'
        ]);

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach(item => {
        settingsMap[item.setting_key] = String(item.setting_value || '');
      });

      return {
        exchangeRate: parseFloat(settingsMap['aliexpress_exchange_rate'] || '250'),
        serviceFeePercentage: parseFloat(settingsMap['aliexpress_service_fee_percentage'] || '5'),
        defaultShippingFee: parseFloat(settingsMap['aliexpress_default_shipping_fee'] || '10'),
      };
    },
  });

  return {
    settings: settings || {
      exchangeRate: 250,
      serviceFeePercentage: 5,
      defaultShippingFee: 10,
    },
    isLoading,
  };
};
