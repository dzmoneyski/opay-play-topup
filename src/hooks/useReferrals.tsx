import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReferredUser {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  status: string;
  reward_amount: number;
  created_at: string;
  activated_at: string | null;
  referred_user?: ReferredUser;
}

interface LeaderboardProfile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
}

interface LeaderboardUser {
  user_id: string;
  active_referrals_count: number;
  total_earned: number;
  profile?: LeaderboardProfile;
}

export const useReferrals = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's referral code
  const { data: referralCode, isLoading: codeLoading } = useQuery({
    queryKey: ['referralCode'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First try to get existing code
      const { data, error } = await supabase
        .from('referral_codes')
        .select('referral_code')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // If code exists, return it
      if (data?.referral_code) {
        return data.referral_code;
      }
      
      // If no code exists, create one using RPC
      const { data: newCode, error: rpcError } = await supabase.rpc('ensure_referral_code', {
        _user_id: user.id
      });
      
      if (rpcError) throw rpcError;
      return newCode as string;
    },
  });

  // Get user's rewards
  const { data: rewards, isLoading: rewardsLoading } = useQuery({
    queryKey: ['referralRewards'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('referral_rewards')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      return data || {
        rewards_balance: 0,
        total_earned: 0,
        total_withdrawn: 0,
        active_referrals_count: 0,
      };
    },
  });

  // Get user's referrals list
  const { data: referrals, isLoading: referralsLoading } = useQuery<Referral[]>({
    queryKey: ['referralsList'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: referralsData, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user details separately
      if (referralsData && referralsData.length > 0) {
        const userIds = referralsData.map(r => r.referred_user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone, email')
          .in('user_id', userIds);

        return referralsData.map(referral => ({
          ...referral,
          referred_user: profiles?.find(p => p.user_id === referral.referred_user_id)
        })) as Referral[];
      }

      return (referralsData || []) as Referral[];
    },
  });

  // Get user's achievements
  const { data: achievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ['userAchievements'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Get leaderboard (top referrers)
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<LeaderboardUser[]>({
    queryKey: ['referralLeaderboard'],
    queryFn: async () => {
      const { data: rewardsData, error } = await supabase
        .from('referral_rewards')
        .select('user_id, active_referrals_count, total_earned')
        .order('active_referrals_count', { ascending: false })
        .order('total_earned', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch user details separately
      if (rewardsData && rewardsData.length > 0) {
        const userIds = rewardsData.map(r => r.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles for leaderboard:', profilesError);
        }

        return rewardsData.map(reward => ({
          ...reward,
          profile: profiles?.find(p => p.user_id === reward.user_id)
        })) as LeaderboardUser[];
      }

      return (rewardsData || []) as LeaderboardUser[];
    },
  });

  // Withdraw rewards mutation
  const withdrawMutation = useMutation({
    mutationFn: async (amount: number) => {
      const { data, error } = await supabase.rpc('withdraw_referral_rewards', {
        _amount: amount,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string; net_amount?: number; fee_percentage?: number };
      
      if (!result.success) {
        throw new Error(result.error || 'فشل السحب');
      }

      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "تم السحب بنجاح",
        description: `تم إضافة ${data.net_amount} دج إلى رصيدك الرئيسي (بعد خصم ${data.fee_percentage}% رسوم)`,
      });
      queryClient.invalidateQueries({ queryKey: ['referralRewards'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
    onError: (error: Error) => {
      toast({
        title: "فشل السحب",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate withdrawal fee percentage
  const getWithdrawalFeePercentage = (activeReferrals: number) => {
    if (activeReferrals >= 100) return 0;
    if (activeReferrals >= 50) return 50;
    if (activeReferrals >= 20) return 80;
    return 100;
  };

  // Calculate how much user can withdraw
  const getWithdrawableAmount = () => {
    if (!rewards) return 0;
    const feePercentage = getWithdrawalFeePercentage(rewards.active_referrals_count);
    if (feePercentage === 100) return 0;
    return rewards.rewards_balance * (1 - feePercentage / 100);
  };

  return {
    referralCode,
    rewards,
    referrals,
    achievements,
    leaderboard,
    loading: codeLoading || rewardsLoading || referralsLoading || achievementsLoading || leaderboardLoading,
    withdrawRewards: withdrawMutation.mutate,
    withdrawing: withdrawMutation.isPending,
    getWithdrawalFeePercentage,
    getWithdrawableAmount,
  };
};
