import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useDeliveryFeeSettings = () => {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["delivery-fee-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_fee_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
  });

  const getDeliveryFee = (wilaya?: string) => {
    if (!settings) return 400;
    
    if (wilaya && settings.wilaya_specific_fees && settings.wilaya_specific_fees[wilaya]) {
      return settings.wilaya_specific_fees[wilaya];
    }
    
    return settings.default_fee || 400;
  };

  return {
    settings,
    isLoading,
    getDeliveryFee,
  };
};
