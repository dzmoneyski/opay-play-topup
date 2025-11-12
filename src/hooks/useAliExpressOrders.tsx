import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

export interface AliExpressOrder {
  id: string;
  user_id: string;
  product_url: string;
  product_images: string[];
  product_price: number;
  shipping_cost: number;
  total_usd: number;
  total_dzd: number;
  exchange_rate: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  status: string;
  admin_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export const useAliExpressOrders = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['aliexpress-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('aliexpress_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AliExpressOrder[];
    },
    enabled: !!user,
  });

  const createOrder = useMutation({
    mutationFn: async (orderData: {
      product_url: string;
      product_images: string[];
      product_price: number;
      shipping_cost: number;
      total_usd: number;
      total_dzd: number;
      exchange_rate: number;
      customer_name: string;
      customer_phone: string;
      customer_address: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // First, deduct the amount from user balance
      const { error: balanceError } = await supabase.rpc('deduct_balance', {
        _user_id: user.id,
        _amount: orderData.total_dzd,
      });

      if (balanceError) throw balanceError;

      // Then create the order
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
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      toast({
        title: 'تم إنشاء الطلب بنجاح',
        description: 'سيتم مراجعة طلبك من قبل المشرف',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ أثناء إنشاء الطلب',
        variant: 'destructive',
      });
      console.error('Error creating order:', error);
    },
  });

  return {
    orders: orders || [],
    isLoading,
    createOrder: createOrder.mutate,
    isCreating: createOrder.isPending,
  };
};
