import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TransactionHistoryItem {
  id: string;
  type: 'deposit' | 'withdrawal' | 'transfer_sent' | 'transfer_received' | 'gift_card' | 'betting' | 'game_topup';
  description: string;
  amount: number;
  status: string;
  created_at: string;
  icon_type: string;
}

export const useTransactionHistory = (limit?: number) => {
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

      // Fetch gift cards using secure RPC
      const { data: giftCards, error: giftCardsError } = await supabase
        .rpc('get_user_gift_card_redemptions');

      // Fetch betting transactions
      const { data: bettingTransactions } = await supabase
        .from('betting_transactions')
        .select('*, platform:game_platforms(name, name_ar)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch game topup orders
      const { data: gameTopups } = await supabase
        .from('game_topup_orders')
        .select('*, platform:game_platforms(name, name_ar)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

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
      if (giftCards && !giftCardsError) {
        giftCards.forEach(card => {
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
      }

      // Process betting transactions
      bettingTransactions?.forEach(transaction => {
        const platformName = (transaction as any).platform?.name_ar || 'منصة مراهنات';
        const typeText = transaction.transaction_type === 'deposit' ? 'إيداع' : 'سحب';
        allTransactions.push({
          id: transaction.id,
          type: 'betting',
          description: `${typeText} على ${platformName}`,
          amount: transaction.transaction_type === 'deposit' ? -Number(transaction.amount) : Number(transaction.amount),
          status: transaction.status,
          created_at: transaction.created_at,
          icon_type: transaction.transaction_type === 'deposit' ? 'send' : 'receive'
        });
      });

      // Process game topup orders
      gameTopups?.forEach(order => {
        const platformName = (order as any).platform?.name_ar || 'لعبة';
        allTransactions.push({
          id: order.id,
          type: 'game_topup',
          description: `شحن ${platformName}`,
          amount: -Number(order.amount),
          status: order.status,
          created_at: order.created_at,
          icon_type: 'game'
        });
      });

      // Sort by date (newest first)
      allTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Apply limit if provided, otherwise show all
      const limitedTransactions = limit ? allTransactions.slice(0, limit) : allTransactions;
      setTransactions(limitedTransactions);
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