import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface AdminDeposit {
  id: string;
  user_id: string;
  payment_method: string;
  amount: number;
  transaction_id: string | null;
  receipt_image: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    phone: string | null;
  };
}

export const useAdminDeposits = () => {
  const [deposits, setDeposits] = React.useState<AdminDeposit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchDeposits = React.useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deposits')
        .select(`
          *,
          profiles:user_id (
            full_name,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeposits((data || []) as any[]);
    } catch (error) {
      console.error('Error fetching deposits:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل طلبات الإيداع",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  const approveDeposit = async (depositId: string, notes?: string) => {
    if (!user) return { success: false, error: "غير مصرح" };

    try {
      const { error } = await supabase.rpc('approve_deposit', {
        _deposit_id: depositId,
        _admin_id: user.id,
        _notes: notes || null
      });

      if (error) throw error;

      // Update local state
      setDeposits(prev => prev.map(deposit => 
        deposit.id === depositId 
          ? { 
              ...deposit, 
              status: 'approved', 
              processed_by: user.id,
              processed_at: new Date().toISOString(),
              admin_notes: notes || null
            }
          : deposit
      ));

      toast({
        title: "تم بنجاح",
        description: "تم قبول طلب الإيداع بنجاح",
      });

      return { success: true };
    } catch (error) {
      console.error('Error approving deposit:', error);
      const errorMessage = error instanceof Error ? error.message : "فشل في قبول الطلب";
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive"
      });
      return { success: false, error: errorMessage };
    }
  };

  const rejectDeposit = async (depositId: string, reason: string) => {
    if (!user) return { success: false, error: "غير مصرح" };

    if (!reason.trim()) {
      toast({
        title: "خطأ",
        description: "يجب إدخال سبب الرفض",
        variant: "destructive"
      });
      return { success: false, error: "سبب الرفض مطلوب" };
    }

    try {
      const { error } = await supabase
        .from('deposits')
        .update({
          status: 'rejected',
          admin_notes: reason,
          processed_by: user.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', depositId);

      if (error) throw error;

      // Update local state
      setDeposits(prev => prev.map(deposit => 
        deposit.id === depositId 
          ? { 
              ...deposit, 
              status: 'rejected', 
              processed_by: user.id,
              processed_at: new Date().toISOString(),
              admin_notes: reason
            }
          : deposit
      ));

      toast({
        title: "تم بنجاح",
        description: "تم رفض طلب الإيداع",
      });

      return { success: true };
    } catch (error) {
      console.error('Error rejecting deposit:', error);
      const errorMessage = error instanceof Error ? error.message : "فشل في رفض الطلب";
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive"
      });
      return { success: false, error: errorMessage };
    }
  };

  return {
    deposits,
    loading,
    fetchDeposits,
    approveDeposit,
    rejectDeposit
  };
};