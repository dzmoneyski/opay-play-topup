import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export type PaymentMethod = 'baridimob' | 'ccp' | 'edahabiya';

export interface Deposit {
  id: string;
  user_id: string;
  payment_method: PaymentMethod;
  amount: number;
  transaction_id: string | null;
  receipt_image: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useDeposits = () => {
  const [deposits, setDeposits] = React.useState<Deposit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const { user, session } = useAuth();

  const fetchDeposits = React.useCallback(async () => {
    if (!user || !session) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeposits((data || []) as Deposit[]);
    } catch (error) {
      console.error('Error fetching deposits:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل تاريخ الإيداعات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, session, toast]);

  React.useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  const uploadReceiptImage = async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('deposit-receipts')
        .upload(fileName, file);

      if (error) throw error;
      return data.path;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast({
        title: "خطأ في الرفع",
        description: "فشل في رفع صورة الوصل",
        variant: "destructive"
      });
      return null;
    }
  };

  const createDeposit = async (
    paymentMethod: PaymentMethod,
    amount: number,
    transactionId: string,
    receiptFile: File
  ) => {
    if (!user) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول أولاً",
        variant: "destructive"
      });
      return { success: false, error: "غير مصرح" };
    }

    setLoading(true);
    try {
      // Upload receipt image first
      const receiptPath = await uploadReceiptImage(receiptFile);
      if (!receiptPath) {
        return { success: false, error: "فشل في رفع صورة الوصل" };
      }

      // Create deposit record
      const { data, error } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          payment_method: paymentMethod,
          amount,
          transaction_id: transactionId,
          receipt_image: receiptPath,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      setDeposits(prev => [data as Deposit, ...prev]);
      
      toast({
        title: "تم بنجاح",
        description: "تم إرسال طلب الإيداع بنجاح. سيتم مراجعته قريباً",
      });

      return { success: true, data };
    } catch (error) {
      console.error('Error creating deposit:', error);
      const errorMessage = error instanceof Error ? error.message : "فشل في إنشاء طلب الإيداع";
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive"
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    deposits,
    loading,
    createDeposit,
    fetchDeposits
  };
};