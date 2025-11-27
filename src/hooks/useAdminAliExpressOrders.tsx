import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AliExpressOrder } from './useAliExpressOrders';

export const useAdminAliExpressOrders = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-aliexpress-orders', page],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('aliexpress_orders')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }
      
      return { 
        orders: data as AliExpressOrder[], 
        count: count || 0 
      };
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({
      orderId,
      status,
      adminNotes,
    }: {
      orderId: string;
      status: string;
      adminNotes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('aliexpress_orders')
        .update({
          status,
          admin_notes: adminNotes,
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-aliexpress-orders'] });
      toast({
        title: 'تم تحديث حالة الطلب',
        description: 'تم تحديث حالة الطلب بنجاح',
      });
    },
    onError: (error) => {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث حالة الطلب',
        variant: 'destructive',
      });
      console.error('Error updating order status:', error);
    },
  });

  return {
    orders: data?.orders || [],
    isLoading,
    updateOrderStatus: updateOrderStatus.mutate,
    isUpdating: updateOrderStatus.isPending,
    page,
    setPage,
    totalCount: data?.count || 0,
    pageSize,
    totalPages: Math.ceil((data?.count || 0) / pageSize)
  };
};
