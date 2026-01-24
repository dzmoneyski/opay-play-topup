import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PhoneOperator {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  logo_url: string | null;
  min_amount: number;
  max_amount: number;
  is_active: boolean;
  display_order: number;
  fee_type: 'percentage' | 'fixed';
  fee_value: number;
  fee_min: number;
  fee_max: number | null;
}

interface PhoneTopupSettings {
  enabled: boolean;
  global_fee_type: 'percentage' | 'fixed';
  global_fee_value: number;
  global_fee_min: number;
  global_fee_max: number | null;
  use_operator_fees: boolean;
}

export const usePhoneOperators = () => {
  const [operators, setOperators] = useState<PhoneOperator[]>([]);
  const [settings, setSettings] = useState<PhoneTopupSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch operators
      const { data: operatorsData, error: operatorsError } = await supabase
        .from('phone_operators')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (operatorsError) throw operatorsError;
      setOperators((operatorsData || []) as PhoneOperator[]);

      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'phone_topup_settings')
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error fetching settings:', settingsError);
      }
      
      if (settingsData) {
        setSettings(settingsData.setting_value as unknown as PhoneTopupSettings);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate fee for a given amount and operator
  const calculateFee = (amount: number, operatorId: string): number => {
    if (amount <= 0) return 0;
    
    const operator = operators.find(op => op.id === operatorId);
    if (!operator) return 0;

    // Determine which fee settings to use
    let feeType: 'percentage' | 'fixed';
    let feeValue: number;
    let feeMin: number;
    let feeMax: number | null;

    if (settings?.use_operator_fees) {
      // Use operator-specific fees
      feeType = operator.fee_type;
      feeValue = operator.fee_value;
      feeMin = operator.fee_min;
      feeMax = operator.fee_max;
    } else if (settings) {
      // Use global fees
      feeType = settings.global_fee_type;
      feeValue = settings.global_fee_value;
      feeMin = settings.global_fee_min;
      feeMax = settings.global_fee_max;
    } else {
      // Default: no fees
      return 0;
    }

    // Calculate fee
    let fee = 0;
    if (feeType === 'percentage') {
      fee = (amount * feeValue) / 100;
    } else {
      fee = feeValue;
    }

    // Apply min/max limits
    fee = Math.max(fee, feeMin);
    if (feeMax !== null) {
      fee = Math.min(fee, feeMax);
    }

    return Math.round(fee);
  };

  return { 
    operators, 
    settings,
    loading, 
    error, 
    refetch: fetchData,
    calculateFee,
    isServiceEnabled: settings?.enabled ?? true
  };
};
