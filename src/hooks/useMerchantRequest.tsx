import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { sendTelegramNotification } from '@/lib/telegramNotify';

interface MerchantRequestData {
  business_name: string;
  business_type: string;
  phone: string;
  address: string;
  national_id: string;
  notes?: string;
}

export const useMerchantRequest = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const submitRequest = async (data: MerchantRequestData) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return { success: false };
    }

    setLoading(true);
    try {
      // Check if user already has a pending or approved request
      const { data: existingRequest } = await supabase
        .from('merchant_requests')
        .select('status')
        .eq('user_id', user.id)
        .single();

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          toast.info('لديك طلب قيد المراجعة بالفعل');
          return { success: false };
        }
        if (existingRequest.status === 'approved') {
          toast.info('أنت تاجر معتمد بالفعل');
          return { success: false };
        }
      }

      const { error } = await supabase
        .from('merchant_requests')
        .insert({
          user_id: user.id,
          ...data
        });

      if (error) throw error;

      // Send Telegram notification
      sendTelegramNotification('new_merchant_request', {
        business_name: data.business_name,
        business_type: data.business_type,
        phone: data.phone
      });

      toast.success('تم إرسال طلبك بنجاح! سيتم مراجعته قريباً');
      return { success: true };
    } catch (error: any) {
      console.error('Error submitting merchant request:', error);
      toast.error('حدث خطأ أثناء إرسال الطلب');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const getMyRequest = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('merchant_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching merchant request:', error);
      return null;
    }
  };

  return {
    submitRequest,
    getMyRequest,
    loading
  };
};
