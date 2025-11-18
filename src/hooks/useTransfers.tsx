import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TransferData {
  recipient_phone: string;
  amount: number;
  note?: string;
}

interface TransferResult {
  success: boolean;
  error?: string;
  transfer_id?: string;
  recipient_id?: string;
  transaction_number?: string;
}

export const useTransfers = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const processTransfer = async (transferData: TransferData): Promise<TransferResult> => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .rpc('process_transfer', {
          recipient_phone_param: transferData.recipient_phone,
          amount_param: transferData.amount,
          note_param: transferData.note || null
        });

      if (error) {
        console.error('Transfer error:', error);
        toast({
          title: "خطأ في التحويل",
          description: "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى",
          variant: "destructive"
        });
        return { success: false, error: error.message };
      }

      const result = data as unknown as TransferResult;
      
      if (!result.success) {
        let errorMessage = "حدث خطأ غير متوقع";
        
        switch (result.error) {
          case 'User not authenticated':
            errorMessage = "يجب تسجيل الدخول أولاً";
            break;
          case 'Recipient not found':
            errorMessage = "رقم الهاتف غير مسجل في النظام";
            break;
          case 'Cannot transfer to yourself':
            errorMessage = "لا يمكن التحويل إلى نفسك";
            break;
          case 'Sender balance not found':
            errorMessage = "لم يتم العثور على رصيدك";
            break;
          case 'Insufficient balance':
            errorMessage = "الرصيد غير كافي للتحويل";
            break;
          default:
            errorMessage = result.error || "حدث خطأ غير متوقع";
        }

        toast({
          title: "فشل التحويل",
          description: errorMessage,
          variant: "destructive"
        });
        
        return { success: false, error: errorMessage };
      }

      const transactionNumber = result.transaction_number || result.transfer_id?.slice(0, 8);
      toast({
        title: "تم التحويل بنجاح",
        description: `تم تحويل ${transferData.amount} دج إلى ${transferData.recipient_phone}${transactionNumber ? ` - رقم المعاملة: ${transactionNumber}` : ''}`,
      });

      return result;
    } catch (error) {
      console.error('Unexpected transfer error:', error);
      toast({
        title: "خطأ في التحويل",
        description: "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
      return { success: false, error: 'Unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const getUserTransfers = async () => {
    try {
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return [];
      }

      const { data, error } = await supabase
        .from('transfers')
        .select(`
          *,
          transaction_number,
          sender:profiles!transfers_sender_id_fkey(full_name, phone),
          recipient:profiles!transfers_recipient_id_fkey(full_name, phone)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transfers:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching transfers:', error);
      return [];
    }
  };

  return {
    processTransfer,
    getUserTransfers,
    isLoading
  };
};