import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AliExpressOrder {
  id: string;
  user_id: string;
  product_url: string;
  product_title: string;
  product_image: string | null;
  price_usd: number;
  shipping_cost_usd: number;
  total_usd: number;
  exchange_rate: number;
  total_dzd: number;
  service_fee_percentage: number;
  service_fee_dzd: number;
  final_total_dzd: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  admin_notes: string | null;
  tracking_number: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useAliExpressOrders = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['aliexpress-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aliexpress_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AliExpressOrder[];
    },
  });

  const createOrder = useMutation({
    mutationFn: async (orderData: {
      product_url: string;
      product_title: string;
      product_image: string | null;
      price_usd: number;
      shipping_cost_usd: number;
      total_usd: number;
      exchange_rate: number;
      total_dzd: number;
      service_fee_percentage: number;
      service_fee_dzd: number;
      final_total_dzd: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('aliexpress_orders')
        .insert({
          user_id: user.id,
          ...orderData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aliexpress-orders'] });
      toast({
        title: 'تم إنشاء الطلب بنجاح',
        description: 'سيتم مراجعة طلبك قريباً',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    orders,
    isLoading,
    createOrder,
  };
};
