import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface TransactionHistoryItem {
  id: string;
  type:
    | "deposit"
    | "withdrawal"
    | "transfer_sent"
    | "transfer_received"
    | "gift_card"
    | "betting"
    | "game_topup"
    | "digital_card";
  description: string;
  amount: number;
  status: string;
  created_at: string;
  icon_type: string;
  transaction_number?: string;
}

type Options = {
  /** Maximum rows to fetch per table (paged in chunks of 1000). */
  maxRows?: number;
};

const PAGE_SIZE = 1000;
const DEFAULT_MAX_ROWS = 5000;

export const useTransactionHistoryPaged = (options?: Options) => {
  const maxRows = options?.maxRows ?? DEFAULT_MAX_ROWS;

  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const { user } = useAuth();

  const fetchPaged = useCallback(
    async <T,>(
      fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
    ) => {
      const all: T[] = [];
      for (let from = 0; from < maxRows; from += PAGE_SIZE) {
        const to = Math.min(from + PAGE_SIZE - 1, maxRows - 1);
        const { data, error } = await fetchPage(from, to);
        if (error) throw error;
        const chunk = data ?? [];
        all.push(...chunk);
        if (chunk.length < PAGE_SIZE) break;
      }
      return all;
    },
    [maxRows]
  );

  const fetchTransactionHistory = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [deposits, transfers, withdrawals, giftCards, bettingTransactions, gameTopups, digitalCards] =
        await Promise.all([
          fetchPaged((from, to) =>
            supabase
              .from("deposits")
              .select("*")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .range(from, to)
          ),
          fetchPaged((from, to) =>
            supabase
              .from("transfers")
              .select("*, transaction_number")
              .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
              .order("created_at", { ascending: false })
              .range(from, to)
          ),
          fetchPaged((from, to) =>
            supabase
              .from("withdrawals")
              .select("*")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .range(from, to)
          ),
          fetchPaged((from, to) =>
            supabase
              .from("gift_cards")
              .select("id, amount, used_at, card_code, created_at")
              .eq("used_by", user.id)
              .eq("is_used", true)
              .order("used_at", { ascending: false })
              .range(from, to)
          ),
          fetchPaged((from, to) =>
            supabase
              .from("betting_transactions")
              .select("*, platform:game_platforms(name, name_ar)")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .range(from, to)
          ),
          fetchPaged((from, to) =>
            supabase
              .from("game_topup_orders")
              .select("*, platform:game_platforms(name, name_ar)")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .range(from, to)
          ),
          fetchPaged((from, to) =>
            supabase
              .from("digital_card_orders")
              .select("*, card_type:digital_card_types(name, name_ar)")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .range(from, to)
          ),
        ]);

      const allTransactions: TransactionHistoryItem[] = [];

      deposits.forEach((deposit: any) => {
        allTransactions.push({
          id: deposit.id,
          type: "deposit",
          description: `إيداع عبر ${
            deposit.payment_method === "baridimob"
              ? "بريدي موب"
              : deposit.payment_method === "ccp"
                ? "حساب جاري بريدي"
                : "الذهبية"
          }`,
          amount: Number(deposit.amount),
          status: deposit.status,
          created_at: deposit.created_at,
          icon_type: "plus",
        });
      });

      transfers.forEach((transfer: any) => {
        const isSender = transfer.sender_id === user.id;
        allTransactions.push({
          id: transfer.id,
          type: isSender ? "transfer_sent" : "transfer_received",
          description: isSender ? `تحويل إلى ${transfer.recipient_phone}` : `تحويل من ${transfer.sender_phone}`,
          amount: isSender ? -Number(transfer.amount) : Number(transfer.amount),
          status: transfer.status,
          created_at: transfer.created_at,
          icon_type: isSender ? "send" : "receive",
          transaction_number: transfer.transaction_number,
        });
      });

      withdrawals.forEach((withdrawal: any) => {
        allTransactions.push({
          id: withdrawal.id,
          type: "withdrawal",
          description: `سحب عبر ${withdrawal.withdrawal_method === "bank" ? "البنك" : "نقداً"}`,
          amount: -Number(withdrawal.amount),
          status: withdrawal.status,
          created_at: withdrawal.created_at,
          icon_type: "withdraw",
        });
      });

      giftCards.forEach((card: any) => {
        allTransactions.push({
          id: card.id,
          type: "gift_card",
          description: "تفعيل بطاقة OpaY",
          amount: Number(card.amount),
          status: "completed",
          created_at: card.used_at || card.created_at,
          icon_type: "gift",
        });
      });

      bettingTransactions.forEach((transaction: any) => {
        const platformName = transaction.platform?.name_ar || "منصة مراهنات";
        const typeText = transaction.transaction_type === "deposit" ? "إيداع" : "سحب";
        allTransactions.push({
          id: transaction.id,
          type: "betting",
          description: `${typeText} على ${platformName}`,
          amount: transaction.transaction_type === "deposit" ? -Number(transaction.amount) : Number(transaction.amount),
          status: transaction.status,
          created_at: transaction.created_at,
          icon_type: transaction.transaction_type === "deposit" ? "send" : "receive",
        });
      });

      gameTopups.forEach((order: any) => {
        const platformName = order.platform?.name_ar || "لعبة";
        allTransactions.push({
          id: order.id,
          type: "game_topup",
          description: `شحن ${platformName}`,
          amount: -Number(order.amount),
          status: order.status,
          created_at: order.created_at,
          icon_type: "game",
        });
      });

      digitalCards.forEach((order: any) => {
        const cardName = order.card_type?.name_ar || "بطاقة رقمية";
        allTransactions.push({
          id: order.id,
          type: "digital_card",
          description: `طلب ${cardName} ($${order.amount_usd})`,
          amount: -Number(order.total_dzd),
          status: order.status,
          created_at: order.created_at,
          icon_type: "card",
        });
      });

      allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTotalCount(allTransactions.length);
      setTransactions(allTransactions);
    } catch (error) {
      console.error("Error fetching transaction history (paged):", error);
      setTransactions([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [fetchPaged, user]);

  useEffect(() => {
    void fetchTransactionHistory();
  }, [fetchTransactionHistory]);

  return { transactions, loading, totalCount, refetch: fetchTransactionHistory };
};
