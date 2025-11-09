import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useDigitalCardSettings = () => {
  const [updating, setUpdating] = useState(false);

  const updateCardType = async (
    cardTypeId: string, 
    updates: {
      exchange_rate?: number;
      min_amount?: number;
      max_amount?: number;
      is_active?: boolean;
    }
  ) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('digital_card_types')
        .update(updates)
        .eq('id', cardTypeId);

      if (error) throw error;

      toast.success('تم تحديث البطاقة بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating card type:', error);
      toast.error('حدث خطأ في تحديث البطاقة');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const updateFeeSettings = async (feeSettings: {
    fee_type: 'percentage' | 'fixed';
    fee_value: number;
    min_fee: number;
    max_fee?: number;
  }) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('digital_card_fee_settings')
        .insert(feeSettings);

      if (error) throw error;

      toast.success('تم تحديث إعدادات العمولة بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating fee settings:', error);
      toast.error('حدث خطأ في تحديث إعدادات العمولة');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  return {
    updating,
    updateCardType,
    updateFeeSettings
  };
};
