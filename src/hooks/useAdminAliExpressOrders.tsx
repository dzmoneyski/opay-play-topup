import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminAliExpressOrder {
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
  profiles?: {
    full_name: string | null;
    phone: string | null;
    email: string | null;
  };
}

export const useAdminAliExpressOrders = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-aliexpress-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aliexpress_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((order) => order.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone, email')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));
        
        return data.map((order) => ({
          ...order,
          profiles: profileMap.get(order.user_id) || null,
        })) as AdminAliExpressOrder[];
      }

      return data as AdminAliExpressOrder[];
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({
      orderId,
      status,
      paymentStatus,
      adminNotes,
      trackingNumber,
    }: {
      orderId: string;
      status?: string;
      paymentStatus?: string;
      adminNotes?: string;
      trackingNumber?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (status) updateData.status = status;
      if (paymentStatus) updateData.payment_status = paymentStatus;
      if (adminNotes !== undefined) updateData.admin_notes = adminNotes;
      if (trackingNumber !== undefined) updateData.tracking_number = trackingNumber;

      if (status === 'completed' || status === 'cancelled') {
        updateData.processed_by = user.id;
        updateData.processed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('aliexpress_orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-aliexpress-orders'] });
      toast({
        title: 'تم تحديث الطلب',
        description: 'تم تحديث حالة الطلب بنجاح',
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
    updateOrderStatus,
  };
};
