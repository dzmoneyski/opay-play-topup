import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AliExpressExchangeRate {
  rate: number;
  last_updated: string;
}

export interface AliExpressFees {
  service_fee_percentage: number;
  default_shipping_fee: number;
  min_service_fee: number;
}

export const useAliExpressSettings = () => {
  const [exchangeRate, setExchangeRate] = useState<AliExpressExchangeRate | null>(null);
  const [fees, setFees] = useState<AliExpressFees | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['aliexpress_exchange_rate', 'aliexpress_fees']);

      if (error) throw error;

      data?.forEach(setting => {
        if (setting.setting_key === 'aliexpress_exchange_rate') {
          setExchangeRate(setting.setting_value as unknown as AliExpressExchangeRate);
        } else if (setting.setting_key === 'aliexpress_fees') {
          setFees(setting.setting_value as unknown as AliExpressFees);
        }
      });
    } catch (error) {
      console.error('Error fetching AliExpress settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateExchangeRate = async (rate: number) => {
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          setting_value: {
            rate,
            last_updated: new Date().toISOString()
          }
        })
        .eq('setting_key', 'aliexpress_exchange_rate');

      if (error) throw error;
      await fetchSettings();
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      throw error;
    }
  };

  const updateFees = async (newFees: AliExpressFees) => {
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          setting_value: newFees as any
        })
        .eq('setting_key', 'aliexpress_fees');

      if (error) throw error;
      await fetchSettings();
    } catch (error) {
      console.error('Error updating fees:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    exchangeRate,
    fees,
    loading,
    updateExchangeRate,
    updateFees,
    refetch: fetchSettings
  };
};
