import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DigitalCardOrder, DigitalCardType } from './useDigitalCards';

interface OrderWithProfile extends DigitalCardOrder {
  profiles?: {
    full_name: string;
    phone: string;
    email: string;
  };
}

export const useAdminDigitalCards = () => {
  const [orders, setOrders] = useState<OrderWithProfile[]>([]);
  const [cardTypes, setCardTypes] = useState<DigitalCardType[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;
  const { toast } = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { count: totalCountResult } = await supabase
        .from('digital_card_orders')
        .select('*', { count: 'exact', head: true });

      setTotalCount(totalCountResult || 0);

      let ordersData: any[] = [];

      if (page === 1) {
        const { data: pendingData } = await supabase
          .from('digital_card_orders')
          .select(`*, profiles (full_name, phone, email)`)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        ordersData = pendingData || [];

        const remaining = pageSize - ordersData.length;
        if (remaining > 0) {
          const { data: otherData } = await supabase
            .from('digital_card_orders')
            .select(`*, profiles (full_name, phone, email)`)
            .neq('status', 'pending')
            .order('created_at', { ascending: false })
            .range(0, remaining - 1);

          ordersData = [...ordersData, ...(otherData || [])];
        }
      } else {
        const { count: pendingCount } = await supabase
          .from('digital_card_orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        const adjustedFrom = (page - 1) * pageSize - (pendingCount || 0);
        const adjustedTo = adjustedFrom + pageSize - 1;

        const { data: otherData } = await supabase
          .from('digital_card_orders')
          .select(`*, profiles (full_name, phone, email)`)
          .neq('status', 'pending')
          .order('created_at', { ascending: false })
          .range(Math.max(0, adjustedFrom), Math.max(0, adjustedTo));

        ordersData = otherData || [];
      }

      setOrders(ordersData as OrderWithProfile[] || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل الطلبات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCardTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('digital_card_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCardTypes(data || []);
    } catch (error) {
      console.error('Error fetching card types:', error);
    }
  };

  const approveOrder = async (orderId: string, receiptImage: string, transactionRef: string, adminNotes: string = '') => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('approve_digital_card_order', {
        _order_id: orderId,
        _receipt_image: receiptImage,
        _transaction_reference: transactionRef,
        _admin_notes: adminNotes || null
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };

      if (result.success) {
        toast({
          title: "تم بنجاح",
          description: result.message || "تمت الموافقة على الطلب",
        });
        await fetchOrders();
        return { success: true };
      } else {
        toast({
          title: "خطأ",
          description: result.error,
          variant: "destructive",
        });
        return { success: false };
      }
    } catch (error) {
      console.error('Error approving order:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الموافقة على الطلب",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setProcessing(false);
    }
  };

  const rejectOrder = async (orderId: string, adminNotes: string = '') => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('reject_digital_card_order', {
        _order_id: orderId,
        _admin_notes: adminNotes || null
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string; refunded_amount?: number };

      if (result.success) {
        toast({
          title: "تم الرفض",
          description: `${result.message} - تم إرجاع ${result.refunded_amount} دج`,
        });
        await fetchOrders();
        return { success: true };
      } else {
        toast({
          title: "خطأ",
          description: result.error,
          variant: "destructive",
        });
        return { success: false };
      }
    } catch (error) {
      console.error('Error rejecting order:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء رفض الطلب",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchCardTypes();
  }, [page]);

  // Real-time subscription for new orders
  useEffect(() => {
    const channel = supabase
      .channel('admin-digital-card-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'digital_card_orders' },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    orders,
    cardTypes,
    loading,
    processing,
    approveOrder,
    rejectOrder,
    refetch: fetchOrders,
    page,
    setPage,
    totalCount,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize)
  };
};
