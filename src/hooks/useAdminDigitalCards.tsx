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
  const { toast } = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('digital_card_orders')
        .select(`
          *,
          profiles (
            full_name,
            phone,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data as OrderWithProfile[] || []);
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
  }, []);

  // Real-time subscription for new orders
  useEffect(() => {
    const channel = supabase
      .channel('admin-digital-card-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'digital_card_orders'
        },
        () => {
          fetchOrders();
        }
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
    refetch: fetchOrders
  };
};
