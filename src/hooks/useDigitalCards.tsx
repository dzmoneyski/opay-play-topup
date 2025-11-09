import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface DigitalCardType {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  logo_url?: string;
  provider: string;
  currency: string;
  is_active: boolean;
  display_order: number;
  exchange_rate: number;
  min_amount: number;
  max_amount: number;
}

export interface DigitalCardFeeSettings {
  id: string;
  fee_type: 'percentage' | 'fixed';
  fee_value: number;
  min_fee: number;
  max_fee?: number;
}

export interface DigitalCardOrder {
  id: string;
  user_id: string;
  card_type_id: string;
  account_id: string;
  amount: number;
  amount_usd: number;
  exchange_rate_used: number;
  fee_amount: number;
  total_dzd: number;
  price_paid: number;
  status: string;
  card_code?: string;
  card_pin?: string;
  card_details?: any;
  receipt_image?: string;
  transaction_reference?: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  processed_by?: string;
  admin_notes?: string;
}

export const useDigitalCards = () => {
  const [cardTypes, setCardTypes] = useState<DigitalCardType[]>([]);
  const [feeSettings, setFeeSettings] = useState<DigitalCardFeeSettings | null>(null);
  const [orders, setOrders] = useState<DigitalCardOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCardTypes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('digital_card_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCardTypes(data || []);
    } catch (error) {
      console.error('Error fetching card types:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل أنواع البطاقات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('digital_card_fee_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setFeeSettings(data as DigitalCardFeeSettings | null);
    } catch (error) {
      console.error('Error fetching fee settings:', error);
    }
  };

  const fetchUserOrders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('digital_card_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const purchaseCard = async (cardTypeId: string, accountId: string, amountUsd: number) => {
    if (!user) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول أولاً",
        variant: "destructive",
      });
      return { success: false };
    }

    setPurchasing(true);
    try {
      const { data, error } = await supabase.rpc('process_digital_card_order', {
        _card_type_id: cardTypeId,
        _account_id: accountId,
        _amount_usd: amountUsd
      });

      if (error) throw error;

      const result = data as { 
        success: boolean; 
        error?: string; 
        message?: string;
        order_id?: string;
        amount_usd?: number;
        amount_dzd?: number;
        fee_amount?: number;
        total_dzd?: number;
      };

      if (result.success) {
        toast({
          title: "نجح الطلب",
          description: result.message || "تم إرسال طلبك بنجاح",
        });
        await fetchUserOrders();
        return { 
          success: true, 
          data: result 
        };
      } else {
        toast({
          title: "خطأ",
          description: result.error,
          variant: "destructive",
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error purchasing card:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء معالجة الطلب",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setPurchasing(false);
    }
  };

  useEffect(() => {
    fetchCardTypes();
    fetchFeeSettings();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserOrders();
    }
  }, [user]);

  return {
    cardTypes,
    feeSettings,
    orders,
    loading,
    purchasing,
    purchaseCard,
    refetch: () => {
      fetchCardTypes();
      fetchFeeSettings();
      fetchUserOrders();
    }
  };
};
