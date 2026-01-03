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
  wilaya?: string;
  city?: string;
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

interface TopupResult {
  success: boolean;
  error?: string;
  message?: string;
  amount?: number;
  commission_amount?: number;
  total_from_customer?: number;
  customer_phone?: string;
  new_balance?: number;
  transaction_id?: string;
}

interface CommissionResult {
  success: boolean;
  error?: string;
  amount?: number;
  commission_rate?: number;
  commission_amount?: number;
  total_from_customer?: number;
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

  // Real-time subscription for merchant updates
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

  // حساب العمولة قبل الشحن
  const calculateCommission = async (amount: number): Promise<CommissionResult> => {
    try {
      const { data, error } = await supabase.rpc('calculate_merchant_commission', {
        _amount: amount
      });

      if (error) throw error;
      return data as unknown as CommissionResult;
    } catch (error: any) {
      console.error('Error calculating commission:', error);
      return { success: false, error: error.message };
    }
  };

  // شحن الزبون - النظام الجديد (يستخدم رصيد التاجر الشخصي)
  const topupCustomer = async (customerPhone: string, amount: number): Promise<TopupResult> => {
    if (!merchant) {
      toast.error('لم يتم العثور على حساب التاجر');
      return { success: false, error: 'لم يتم العثور على حساب التاجر' };
    }

    try {
      const { data, error } = await supabase.rpc('merchant_topup_customer', {
        _customer_phone: customerPhone,
        _amount: amount
      });

      if (error) throw error;

      const result = data as unknown as TopupResult;

      if (!result.success) {
        toast.error(result.error || 'فشلت العملية');
        return result;
      }

      toast.success(
        `تم شحن ${result.amount} دج بنجاح! عمولتك: ${result.commission_amount} دج`,
        { duration: 5000 }
      );
      
      // Refresh data
      await fetchMerchantData();
      await fetchTransactions();

      return result;
    } catch (error: any) {
      console.error('Error topping up customer:', error);
      toast.error(error.message || 'حدث خطأ أثناء الشحن');
      return { success: false, error: error.message };
    }
  };

  // الدالة القديمة (للتوافق مع الكود القديم) - تُعيد توجيه للدالة الجديدة
  const rechargeCustomer = async (customerPhone: string, amount: number) => {
    return topupCustomer(customerPhone, amount);
  };

  // هذه الدالة لم تعد مطلوبة لكن نحتفظ بها للتوافق
  const transferFromUserBalance = async (amount: number) => {
    toast.info('في النظام الجديد، رصيدك الشخصي هو نفسه رصيد التاجر');
    return { success: true };
  };

  return {
    merchant,
    transactions,
    loading,
    calculateCommission,
    topupCustomer,
    rechargeCustomer, // للتوافق مع الكود القديم
    transferFromUserBalance, // للتوافق مع الكود القديم
    refreshData: () => {
      fetchMerchantData();
      fetchTransactions();
    }
  };
};
