import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface Merchant {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  phone: string;
  address: string;
  merchant_code: string;
  balance: number;
  total_earnings: number;
  commission_rate: number;
  merchant_tier: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MerchantTransaction {
  id: string;
  merchant_id: string;
  transaction_type: string;
  customer_phone: string | null;
  customer_user_id: string | null;
  amount: number;
  commission_amount: number | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export const useMerchant = () => {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchMerchantData();
      fetchTransactions();
    } else {
      setMerchant(null);
      setTransactions([]);
      setLoading(false);
    }
  }, [user]);

  // Real-time subscription for merchant balance updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('merchant-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'merchants',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new) {
            setMerchant(payload.new as Merchant);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchMerchantData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setMerchant(data);
    } catch (error) {
      console.error('Error fetching merchant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      const { data: merchantData } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!merchantData) return;

      const { data, error } = await supabase
        .from('merchant_transactions')
        .select('*')
        .eq('merchant_id', merchantData.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const rechargeCustomer = async (customerPhone: string, amount: number) => {
    if (!merchant) {
      toast.error('لم يتم العثور على حساب التاجر');
      return { success: false };
    }

    try {
      const { data, error } = await supabase.rpc('merchant_recharge_customer', {
        _customer_phone: customerPhone,
        _amount: amount
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; amount?: number; commission?: number; cost?: number };

      if (!result.success) {
        toast.error(result.error || 'فشلت العملية');
        return { success: false };
      }

      toast.success(`تم شحن ${result.amount} دج بنجاح! عمولتك: ${result.commission} دج`);
      
      // Refresh data
      await fetchMerchantData();
      await fetchTransactions();

      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error recharging customer:', error);
      toast.error(error.message || 'حدث خطأ أثناء الشحن');
      return { success: false };
    }
  };

  const transferFromUserBalance = async (amount: number) => {
    if (!merchant) {
      toast.error('لم يتم العثور على حساب التاجر');
      return { success: false };
    }

    try {
      const { data, error } = await supabase.rpc('merchant_transfer_from_user_balance', {
        _amount: amount
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; amount?: number; new_merchant_balance?: number };

      if (!result.success) {
        toast.error(result.error || 'فشلت العملية');
        return { success: false };
      }

      toast.success(`تم تحويل ${result.amount} دج إلى حساب التاجر بنجاح!`);
      
      // Refresh data
      await fetchMerchantData();
      await fetchTransactions();

      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error transferring balance:', error);
      toast.error(error.message || 'حدث خطأ أثناء التحويل');
      return { success: false };
    }
  };

  return {
    merchant,
    transactions,
    loading,
    rechargeCustomer,
    transferFromUserBalance,
    refreshData: () => {
      fetchMerchantData();
      fetchTransactions();
    }
  };
};
