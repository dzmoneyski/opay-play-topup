import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TransactionHistoryItem {
  id: string;
  type: 'deposit' | 'withdrawal' | 'transfer_sent' | 'transfer_received' | 'gift_card' | 'betting' | 'game_topup' | 'digital_card';
  description: string;
  amount: number;
  status: string;
  created_at: string;
  icon_type: string;
  transaction_number?: string; // For transfers
}

export const useTransactionHistory = (limit: number = 50) => {
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTransactionHistory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch only limited number of recent transactions
      const itemsPerType = Math.ceil(limit / 8);
      
      const [deposits, transfers, withdrawals, giftCards, bettingTransactions, gameTopups, digitalCards] = await Promise.all([
        supabase
          .from('deposits')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(itemsPerType),
        
        supabase
          .from('transfers')
          .select('*, transaction_number')
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(itemsPerType),
        
        supabase
          .from('withdrawals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(itemsPerType),
        
        // جلب بطاقات الهدايا مباشرة للمستخدم الحالي
        supabase
          .from('gift_cards')
          .select('id, amount, used_at, card_code')
          .eq('used_by', user.id)
          .eq('is_used', true)
          .order('used_at', { ascending: false })
          .limit(itemsPerType),
        
        supabase
          .from('betting_transactions')
          .select('*, platform:game_platforms(name, name_ar)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(itemsPerType),
        
        supabase
          .from('game_topup_orders')
          .select('*, platform:game_platforms(name, name_ar)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(itemsPerType),
        
        // جلب طلبات البطاقات الرقمية
        supabase
          .from('digital_card_orders')
          .select('*, card_type:digital_card_types(name, name_ar)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(itemsPerType)
      ]);

      const allTransactions: TransactionHistoryItem[] = [];

      // Process deposits
      deposits.data?.forEach(deposit => {
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
      transfers.data?.forEach(transfer => {
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
          icon_type: isSender ? 'send' : 'receive',
          transaction_number: transfer.transaction_number
        });
      });

      // Process withdrawals
      withdrawals.data?.forEach(withdrawal => {
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
      if (giftCards.data && !giftCards.error) {
        giftCards.data.forEach((card: any) => {
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
      bettingTransactions.data?.forEach(transaction => {
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
      gameTopups.data?.forEach(order => {
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

      // Process digital card orders
      digitalCards.data?.forEach(order => {
        const cardName = (order as any).card_type?.name_ar || 'بطاقة رقمية';
        allTransactions.push({
          id: order.id,
          type: 'digital_card',
          description: `طلب ${cardName} ($${order.amount_usd})`,
          amount: -Number(order.total_dzd),
          status: order.status,
          created_at: order.created_at,
          icon_type: 'card'
        });
      });

      // Sort by date descending (newest first) - ensure proper timestamp comparison
      allTransactions.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // Descending: newest first
      });
      
      setTransactions(allTransactions.slice(0, limit));
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