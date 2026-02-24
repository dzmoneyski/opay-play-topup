import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { sendTelegramNotification } from '@/lib/telegramNotify';

interface PhoneTopupOrder {
  id: string;
  user_id: string;
  operator_id: string;
  phone_number: string;
  amount: number;
  status: string;
  admin_notes: string | null;
  notes: string | null;
  processed_at: string | null;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
  phone_operators?: {
    name: string;
    name_ar: string;
    slug: string;
  };
}

export const usePhoneTopupOrders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<PhoneTopupOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();

      // Real-time subscription for order updates
      const channel = supabase
        .channel('user-phone-topup-orders')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'phone_topup_orders',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newStatus = payload.new.status;
            const oldStatus = payload.old?.status;
            
            if (newStatus !== oldStatus) {
              if (newStatus === 'approved') {
                toast({
                  title: '✅ تم قبول طلب الشحن',
                  description: `تم شحن ${payload.new.amount} د.ج بنجاح!`,
                });
              } else if (newStatus === 'rejected') {
                toast({
                  title: '❌ تم رفض طلب الشحن',
                  description: payload.new.admin_notes || 'تم رفض طلبك',
                  variant: 'destructive'
                });
              }
            }
            fetchOrders();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'phone_topup_orders',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('phone_topup_orders')
        .select('*, phone_operators(name, name_ar, slug)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (operatorId: string, phoneNumber: string, amount: number, notes?: string) => {
    try {
      const { data, error } = await supabase.rpc('process_phone_topup_order', {
        _operator_id: operatorId,
        _phone_number: phoneNumber,
        _amount: amount,
        _notes: notes || null
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };
      
      if (!result.success) {
        toast({
          title: 'خطأ',
          description: result.error,
          variant: 'destructive'
        });
        return false;
      }

      toast({
        title: 'نجاح',
        description: result.message
      });

      // Send Telegram notification
      sendTelegramNotification('new_phone_topup', {
        amount,
        phone_number: phoneNumber,
        operator_name: operatorId
      });
      
      fetchOrders();
      return true;
    } catch (err: any) {
      toast({
        title: 'خطأ',
        description: err.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  return { orders, loading, createOrder, refetch: fetchOrders };
};
