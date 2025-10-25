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
          title: "تم التحقق بنجاح",
          description: data.message,
        });
        queryClient.invalidateQueries({ queryKey: ["betting-accounts"] });
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
