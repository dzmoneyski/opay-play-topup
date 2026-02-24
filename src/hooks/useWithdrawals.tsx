import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { sendTelegramNotification } from '@/lib/telegramNotify';

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  withdrawal_method: 'opay' | 'barid_bank' | 'ccp' | 'albaraka' | 'badr' | 'cash';
  account_number?: string;
  account_holder_name?: string;
  cash_location?: string;
  status: string;
  notes?: string;
  admin_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export const useWithdrawals = () => {
  const [withdrawals, setWithdrawals] = React.useState<Withdrawal[]>([]);
  const [loading, setLoading] = React.useState(false);
  const { user } = useAuth();

  const fetchWithdrawals = React.useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals((data || []) as Withdrawal[]);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createWithdrawal = React.useCallback(async (withdrawalData: {
    amount: number;
    withdrawal_method: string;
    account_number?: string;
    account_holder_name?: string;
    cash_location?: string;
    notes?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    // استخدام الدالة الآمنة التي تتحقق من الرصيد في الـ backend
    const { data, error } = await supabase.rpc('create_withdrawal', {
      _amount: withdrawalData.amount,
      _withdrawal_method: withdrawalData.withdrawal_method,
      _account_number: withdrawalData.account_number || null,
      _account_holder_name: withdrawalData.account_holder_name || null,
      _cash_location: withdrawalData.cash_location || null,
      _notes: withdrawalData.notes || null
    });

    if (error) throw error;
    
    // التحقق من نتيجة الدالة
    const result = data as { 
      success: boolean; 
      error?: string; 
      withdrawal_id?: string;
      details?: {
        current_balance: number;
        requested_amount: number;
        fee_amount: number;
        total_required: number;
      };
    };
    
    if (!result.success) {
      // إذا كان هناك تفاصيل الرصيد، أضفها للرسالة
      if (result.details) {
        const { current_balance, total_required } = result.details;
        throw new Error(`رصيدك غير كافٍ. المتاح: ${current_balance.toFixed(2)} دج، المطلوب: ${total_required.toFixed(2)} دج`);
      }
      throw new Error(result.error || 'فشل في إنشاء طلب السحب');
    }
    
    // Send Telegram notification
    sendTelegramNotification('new_withdrawal', {
      amount: withdrawalData.amount,
      user_id: user.id,
      withdrawal_method: withdrawalData.withdrawal_method
    });

    // إعادة تحديث قائمة السحب
    await fetchWithdrawals();
    
    return result;
  }, [user, fetchWithdrawals]);

  React.useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  // إضافة اشتراك في الوقت الفعلي لتحديثات السحب
  React.useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('withdrawal-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdrawals',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchWithdrawals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchWithdrawals]);

  return {
    withdrawals,
    loading,
    createWithdrawal,
    fetchWithdrawals
  };
};