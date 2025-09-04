import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TransferData {
  recipient: string;
  amount: string;
  note?: string;
}

interface TransferResponse {
  success: boolean;
  error?: string;
  transfer_id?: string;
  recipient_id?: string;
}

export const useTransfers = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const processTransfer = async (transferData: TransferData): Promise<TransferResponse> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('process_transfer', {
        recipient_phone_param: transferData.recipient,
        amount_param: parseFloat(transferData.amount),
        note_param: transferData.note || null
      });

      if (error) {
        console.error('Transfer error:', error);
        return { success: false, error: error.message };
      }

      return data as unknown as TransferResponse;
    } catch (error) {
      console.error('Transfer error:', error);
      return { success: false, error: 'فشل في عملية التحويل' };
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserTransfers = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('transfers')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transfers:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error fetching transfers:', error);
      return [];
    }
  };

  return {
    processTransfer,
    fetchUserTransfers,
    isLoading
  };
};