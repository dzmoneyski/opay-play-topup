import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AliExpressOrder {
  id: string;
  user_id: string;
  product_url: string;
  product_title: string;
  product_image: string | null;
  price_usd: number;
  price_dzd: number;
  exchange_rate: number;
  service_fee: number;
  shipping_fee: number;
  total_dzd: number;
  quantity: number;
  delivery_address: string;
  delivery_phone: string;
  delivery_name: string;
  notes: string | null;
  status: string;
  admin_notes: string | null;
  tracking_number: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string;
    phone: string;
  };
}

export const useAliExpressOrders = (adminView = false) => {
  const [orders, setOrders] = useState<AliExpressOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchOrders = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('aliexpress_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!adminView) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(order => order.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
        
        const ordersWithUsers = data.map(order => ({
          ...order,
          user: profileMap.get(order.user_id) || { full_name: 'غير محدد', phone: 'غير محدد' }
        }));
        
        setOrders(ordersWithUsers as AliExpressOrder[]);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching AliExpress orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (orderData: {
    product_url: string;
    product_title: string;
    product_image: string | null;
    price_usd: number;
    price_dzd: number;
    exchange_rate: number;
    service_fee: number;
    shipping_fee: number;
    total_dzd: number;
    quantity: number;
    delivery_address: string;
    delivery_phone: string;
    delivery_name: string;
    notes?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('aliexpress_orders')
        .insert({
          ...orderData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      await fetchOrders();
      return data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    status: string,
    adminNotes?: string,
    trackingNumber?: string
  ) => {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (adminNotes) updateData.admin_notes = adminNotes;
      if (trackingNumber) updateData.tracking_number = trackingNumber;
      if (status !== 'pending') {
        updateData.processed_by = user?.id;
        updateData.processed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('aliexpress_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;
      await fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('aliexpress_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aliexpress_orders',
          filter: adminView ? undefined : `user_id=eq.${user?.id}`
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, adminView]);

  return {
    orders,
    loading,
    createOrder,
    updateOrderStatus,
    refetch: fetchOrders
  };
};
