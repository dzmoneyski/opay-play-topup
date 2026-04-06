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
      const { count: totalCount } = await supabase
        .from('aliexpress_orders')
        .select('*', { count: 'exact', head: true });

      let ordersData: any[] = [];

      if (page === 1) {
        const { data: pendingData } = await supabase
          .from('aliexpress_orders')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        ordersData = pendingData || [];

        const remaining = pageSize - ordersData.length;
        if (remaining > 0) {
          const { data: otherData } = await supabase
            .from('aliexpress_orders')
            .select('*')
            .neq('status', 'pending')
            .order('created_at', { ascending: false })
            .range(0, remaining - 1);

          ordersData = [...ordersData, ...(otherData || [])];
        }
      } else {
        const { count: pendingCount } = await supabase
          .from('aliexpress_orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        const adjustedFrom = (page - 1) * pageSize - (pendingCount || 0);
        const adjustedTo = adjustedFrom + pageSize - 1;

        const { data: otherData } = await supabase
          .from('aliexpress_orders')
          .select('*')
          .neq('status', 'pending')
          .order('created_at', { ascending: false })
          .range(Math.max(0, adjustedFrom), Math.max(0, adjustedTo));

        ordersData = otherData || [];
      }

      return { 
        orders: ordersData as AliExpressOrder[], 
        count: totalCount || 0 
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
