import React from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WithdrawalMethodSetting {
  enabled: boolean;
  disabled_reason: string;
}

export interface WithdrawalMethodSettings {
  opay: WithdrawalMethodSetting;
  barid_bank: WithdrawalMethodSetting;
  ccp: WithdrawalMethodSetting;
  albaraka: WithdrawalMethodSetting;
  badr: WithdrawalMethodSetting;
  cash: WithdrawalMethodSetting;
}

const defaultSettings: WithdrawalMethodSettings = {
  opay: { enabled: true, disabled_reason: '' },
  barid_bank: { enabled: true, disabled_reason: '' },
  ccp: { enabled: true, disabled_reason: '' },
  albaraka: { enabled: false, disabled_reason: 'قريباً' },
  badr: { enabled: false, disabled_reason: 'قريباً' },
  cash: { enabled: true, disabled_reason: '' }
};

export const useWithdrawalMethodSettings = () => {
  const [settings, setSettings] = React.useState<WithdrawalMethodSettings>(defaultSettings);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('platform_settings')
          .select('setting_value')
          .eq('setting_key', 'withdrawal_methods')
          .maybeSingle();

        if (error) throw error;

        if (data?.setting_value) {
          setSettings(data.setting_value as unknown as WithdrawalMethodSettings);
        }
      } catch (error) {
        console.error('Error fetching withdrawal method settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const isMethodEnabled = (method: string): boolean => {
    return settings[method as keyof WithdrawalMethodSettings]?.enabled ?? true;
  };

  const getDisabledReason = (method: string): string => {
    return settings[method as keyof WithdrawalMethodSettings]?.disabled_reason ?? '';
  };

  return {
    settings,
    loading,
    isMethodEnabled,
    getDisabledReason
  };
};
