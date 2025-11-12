import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAliExpressSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: exchangeRate, isLoading } = useQuery({
    queryKey: ['aliexpress-exchange-rate'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'aliexpress_exchange_rate')
        .single();

      if (error) throw error;
      return (data?.setting_value as { rate: number })?.rate || 270;
    },
  });

  const updateExchangeRate = useMutation({
    mutationFn: async (newRate: number) => {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          setting_value: { rate: newRate },
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', 'aliexpress_exchange_rate');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aliexpress-exchange-rate'] });
      toast({
        title: 'تم تحديث سعر الصرف',
        description: 'تم تحديث سعر الصرف بنجاح',
      });
    },
    onError: (error) => {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث سعر الصرف',
        variant: 'destructive',
      });
      console.error('Error updating exchange rate:', error);
    },
  });

  return {
    exchangeRate: exchangeRate || 270,
    isLoading,
    updateExchangeRate: updateExchangeRate.mutate,
  };
};
