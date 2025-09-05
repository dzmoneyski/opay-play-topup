import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TransactionHistoryItem {
  id: string;
  type: 'deposit' | 'withdrawal' | 'transfer_sent' | 'transfer_received' | 'gift_card';
  description: string;
  amount: number;
  status: string;
  created_at: string;
  icon_type: string;
}

export const useTransactionHistory = () => {
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTransactionHistory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch deposits
      const { data: deposits } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch transfers (sent and received)
      const { data: transfers } = await supabase
        .from('transfers')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      // Fetch withdrawals
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch gift cards
      const { data: giftCards } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('used_by', user.id)
        .order('used_at', { ascending: false });

      const allTransactions: TransactionHistoryItem[] = [];

      // Process deposits
      deposits?.forEach(deposit => {
        allTransactions.push({
          id: deposit.id,
          type: 'deposit',
          description: `إيداع عبر ${deposit.payment_method === 'baridimob' ? 'بريدي موب' : deposit.payment_method === 'ccp' ? 'حساب جاري بريدي' : 'الذهبية'}`,
          amount: Number(deposit.amount),
          status: deposit.status,
          created_at: deposit.created_at,
          icon_type: 'plus'
        });
      });

      // Process transfers
      transfers?.forEach(transfer => {
        const isSender = transfer.sender_id === user.id;
        allTransactions.push({
          id: transfer.id,
          type: isSender ? 'transfer_sent' : 'transfer_received', 
          description: isSender 
            ? `تحويل إلى ${transfer.recipient_phone}`
            : `تحويل من ${transfer.sender_phone}`,
          amount: isSender ? -Number(transfer.amount) : Number(transfer.amount),
          status: transfer.status,
          created_at: transfer.created_at,
          icon_type: isSender ? 'send' : 'receive'
        });
      });

      // Process withdrawals
      withdrawals?.forEach(withdrawal => {
        allTransactions.push({
          id: withdrawal.id,
          type: 'withdrawal',
          description: `سحب عبر ${withdrawal.withdrawal_method === 'bank' ? 'البنك' : 'نقداً'}`,
          amount: -Number(withdrawal.amount),
          status: withdrawal.status,
          created_at: withdrawal.created_at,
          icon_type: 'withdraw'
        });
      });

      // Process gift cards
      giftCards?.forEach(card => {
        allTransactions.push({
          id: card.id,
          type: 'gift_card',
          description: `تفعيل بطاقة OpaY`,
          amount: Number(card.amount),
          status: 'completed',
          created_at: card.used_at || card.created_at,
          icon_type: 'gift'
        });
      });

      // Sort by date (newest first)
      allTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(allTransactions.slice(0, 10)); // Show last 10 transactions
    } catch (error) {
      console.error('Error fetching transaction history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactionHistory();
  }, [user]);

  return { transactions, loading, refetch: fetchTransactionHistory };
};