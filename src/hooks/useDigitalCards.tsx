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
}

export interface DigitalCardDenomination {
  id: string;
  card_type_id: string;
  amount: number;
  price_dzd: number;
  stock_quantity: number;
  is_available: boolean;
}

export interface DigitalCardOrder {
  id: string;
  user_id: string;
  card_type_id: string;
  denomination_id: string;
  amount: number;
  price_paid: number;
  status: string;
  card_code?: string;
  card_pin?: string;
  card_details?: any;
  created_at: string;
  updated_at: string;
}

export const useDigitalCards = () => {
  const [cardTypes, setCardTypes] = useState<DigitalCardType[]>([]);
  const [denominations, setDenominations] = useState<DigitalCardDenomination[]>([]);
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
        .eq('is_active', true)
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

  const fetchDenominations = async () => {
    try {
      const { data, error } = await supabase
        .from('digital_card_denominations')
        .select('*')
        .eq('is_available', true)
        .order('amount', { ascending: true });

      if (error) throw error;
      setDenominations(data || []);
    } catch (error) {
      console.error('Error fetching denominations:', error);
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

  const purchaseCard = async (denominationId: string, cardTypeId: string) => {
    if (!user) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول أولاً",
        variant: "destructive",
      });
      return false;
    }

    setPurchasing(true);
    try {
      // Find the denomination details
      const denomination = denominations.find(d => d.id === denominationId);
      if (!denomination) {
        throw new Error('Denomination not found');
      }

      // Check user balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (balanceError) throw balanceError;

      if (!balanceData || balanceData.balance < denomination.price_dzd) {
        toast({
          title: "رصيد غير كافٍ",
          description: `رصيدك الحالي غير كافٍ لشراء هذه البطاقة. السعر: ${denomination.price_dzd} دج`,
          variant: "destructive",
        });
        return false;
      }

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('digital_card_orders')
        .insert({
          user_id: user.id,
          card_type_id: cardTypeId,
          denomination_id: denominationId,
          amount: denomination.amount,
          price_paid: denomination.price_dzd,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Deduct balance
      const { error: updateError } = await supabase
        .from('user_balances')
        .update({ 
          balance: balanceData.balance - denomination.price_dzd,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "تم الطلب بنجاح",
        description: "سيتم معالجة طلبك وإرسال البطاقة قريباً",
      });

      await fetchUserOrders();
      return true;
    } catch (error) {
      console.error('Error purchasing card:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء شراء البطاقة",
        variant: "destructive",
      });
      return false;
    } finally {
      setPurchasing(false);
    }
  };

  useEffect(() => {
    fetchCardTypes();
    fetchDenominations();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserOrders();
    }
  }, [user]);

  return {
    cardTypes,
    denominations,
    orders,
    loading,
    purchasing,
    purchaseCard,
    refetch: () => {
      fetchCardTypes();
      fetchDenominations();
      fetchUserOrders();
    }
  };
};
