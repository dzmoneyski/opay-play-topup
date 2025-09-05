import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FeeConfig {
  enabled: boolean;
  percentage: number;
  fixed_amount: number;
  min_fee: number;
  max_fee: number;
}

export interface FeeSettings {
  deposit_fees: FeeConfig;
  withdrawal_fees: FeeConfig;
  transfer_fees: FeeConfig;
}

export const useFeeSettings = () => {
  const [feeSettings, setFeeSettings] = useState<FeeSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFeeSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['deposit_fees', 'withdrawal_fees', 'transfer_fees']);

      if (error) throw error;

      const settings: Partial<FeeSettings> = {};
      data?.forEach(setting => {
        settings[setting.setting_key as keyof FeeSettings] = setting.setting_value as unknown as FeeConfig;
      });

      setFeeSettings(settings as FeeSettings);
    } catch (error) {
      console.error('Error fetching fee settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeSettings();
  }, []);

  return { feeSettings, loading, refetch: fetchFeeSettings };
};