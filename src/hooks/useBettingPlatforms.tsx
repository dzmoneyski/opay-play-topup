import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BettingAccount {
  id: string;
  user_id: string;
  platform_id: string;
  player_id: string;
  promo_code: string;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BettingTransaction {
  id: string;
  user_id: string;
  platform_id: string;
  player_id: string;
  transaction_type: 'deposit' | 'withdrawal';
  amount: number;
  withdrawal_code?: string;
  status: 'pending' | 'completed' | 'rejected';
  created_at: string;
}

export const useVerifyBettingAccount = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      platform_id: string;
      player_id: string;
      promo_code: string;
    }) => {
      const { data: result, error } = await supabase.rpc('verify_betting_account', {
        _platform_id: data.platform_id,
        _player_id: data.player_id,
        _promo_code: data.promo_code,
      });

      if (error) throw error;
      return result as any;
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "تم إرسال طلب التحقق",
          description: "سيتم مراجعة طلبك من قبل المشرف. يرجى الانتظار...",
        });
        queryClient.invalidateQueries({ queryKey: ["betting-accounts"] });
        queryClient.invalidateQueries({ queryKey: ["betting-account"] });
      } else {
        toast({
          title: "خطأ في التحقق",
          description: data.error,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء التحقق",
        variant: "destructive",
      });
    },
  });
};

export const useCreateBettingDeposit = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      platform_id: string;
      player_id: string;
      amount: number;
    }) => {
      const { data: result, error } = await supabase.rpc('process_betting_deposit', {
        _platform_id: data.platform_id,
        _player_id: data.player_id,
        _amount: data.amount,
      });

      if (error) throw error;
      return result as any;
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "تم الإيداع بنجاح",
          description: data.message,
        });
        queryClient.invalidateQueries({ queryKey: ["betting-transactions"] });
        queryClient.invalidateQueries({ queryKey: ["balance"] });
      } else {
        toast({
          title: "خطأ في الإيداع",
          description: data.error,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء الإيداع",
        variant: "destructive",
      });
    },
  });
};

export const useCreateBettingWithdrawal = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      platform_id: string;
      player_id: string;
      withdrawal_code: string;
      amount: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: result, error } = await supabase
        .from("betting_transactions")
        .insert({
          user_id: user.id,
          platform_id: data.platform_id,
          player_id: data.player_id,
          transaction_type: 'withdrawal',
          withdrawal_code: data.withdrawal_code,
          amount: data.amount,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({
        title: "تم إرسال طلب السحب",
        description: "سيتم مراجعة طلبك من قبل المشرف",
      });
      queryClient.invalidateQueries({ queryKey: ["betting-transactions"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إرسال طلب السحب",
        variant: "destructive",
      });
    },
  });
};

export const useBettingAccount = (platformId: string | null, playerId: string) => {
  return useQuery({
    queryKey: ["betting-account", platformId, playerId],
    queryFn: async () => {
      if (!platformId || !playerId) return null;
      
      const { data, error } = await supabase
        .from("betting_accounts")
        .select("*")
        .eq("platform_id", platformId)
        .eq("player_id", playerId)
        .maybeSingle();

      if (error) throw error;
      return data as BettingAccount | null;
    },
    enabled: !!platformId && !!playerId,
  });
};

// Get user's betting account for a specific platform (any player ID)
export const useUserBettingAccountForPlatform = (platformId: string | null) => {
  return useQuery({
    queryKey: ["user-betting-account", platformId],
    queryFn: async () => {
      if (!platformId) return null;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("betting_accounts")
        .select("*")
        .eq("platform_id", platformId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as BettingAccount | null;
    },
    enabled: !!platformId,
  });
};

// Admin hooks
export const useAdminBettingAccounts = () => {
  return useQuery({
    queryKey: ["admin-betting-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("betting_accounts")
        .select(`
          *,
          platform:game_platforms(*),
          user:profiles(full_name, phone)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useAdminBettingTransactions = () => {
  return useQuery({
    queryKey: ["admin-betting-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("betting_transactions")
        .select(`
          *,
          platform:game_platforms(*),
          user:profiles(full_name, phone)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useApproveBettingAccount = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from("betting_accounts")
        .update({ 
          is_verified: true,
          verified_at: new Date().toISOString()
        })
        .eq("id", accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "تم الموافقة",
        description: "تم الموافقة على الحساب بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-betting-accounts"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useRejectBettingAccount = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from("betting_accounts")
        .delete()
        .eq("id", accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "تم الرفض",
        description: "تم رفض الحساب وحذفه",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-betting-accounts"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useApproveWithdrawal = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { transactionId: string; adminNotes?: string }) => {
      const { error } = await supabase
        .from("betting_transactions")
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          admin_notes: data.adminNotes,
        })
        .eq("id", data.transactionId);

      if (error) throw error;

      // Get transaction details to credit user
      const { data: transaction } = await supabase
        .from("betting_transactions")
        .select("user_id, amount")
        .eq("id", data.transactionId)
        .single();

      if (transaction) {
        // Credit user balance
        const { data: balance } = await supabase
          .from("user_balances")
          .select("balance")
          .eq("user_id", transaction.user_id)
          .single();

        await supabase
          .from("user_balances")
          .update({
            balance: (balance?.balance || 0) + transaction.amount,
          })
          .eq("user_id", transaction.user_id);
      }
    },
    onSuccess: () => {
      toast({
        title: "تم الموافقة على السحب",
        description: "تمت إضافة المبلغ إلى رصيد المستخدم",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-betting-transactions"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useRejectWithdrawal = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { transactionId: string; adminNotes?: string }) => {
      const { error } = await supabase
        .from("betting_transactions")
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          admin_notes: data.adminNotes,
        })
        .eq("id", data.transactionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "تم رفض السحب",
        description: "تم رفض طلب السحب",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-betting-transactions"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useBettingTransactions = () => {
  return useQuery({
    queryKey: ["betting-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("betting_transactions")
        .select(`
          *,
          platform:game_platforms(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};
