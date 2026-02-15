import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface P2PAd {
  id: string;
  user_id: string;
  ad_type: 'buy' | 'sell';
  amount: number;
  min_amount: number;
  max_amount: number;
  price_per_unit: number;
  payment_methods: string[];
  terms: string | null;
  is_active: boolean;
  completed_trades: number;
  total_volume: number;
  created_at: string;
  updated_at: string;
  // joined
  trader_profile?: P2PTraderProfile | null;
  user_name?: string;
}

export interface P2POrder {
  id: string;
  ad_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  total_price: number;
  payment_method: string;
  platform_fee: number;
  fee_percentage: number;
  status: string;
  escrow_locked_at: string | null;
  payment_sent_at: string | null;
  payment_confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  payment_deadline: string | null;
  buyer_rating: number | null;
  seller_rating: number | null;
  buyer_review: string | null;
  seller_review: string | null;
  created_at: string;
  updated_at: string;
}

export interface P2PTraderProfile {
  id: string;
  user_id: string;
  total_trades: number;
  successful_trades: number;
  avg_rating: number;
  total_volume: number;
  avg_release_time: number;
  is_verified_trader: boolean;
  last_active_at: string;
}

export interface P2PMessage {
  id: string;
  order_id: string;
  sender_id: string;
  message: string | null;
  image_url: string | null;
  is_system: boolean;
  is_read: boolean;
  created_at: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  baridimob: 'بريدي موب',
  ccp: 'CCP',
  payeer: 'Payeer',
  redotpay: 'RedotPay',
  cash: 'كاش',
};

export const getPaymentMethodLabel = (method: string) => 
  PAYMENT_METHOD_LABELS[method] || method;

export const useP2PAds = (adType?: 'buy' | 'sell') => {
  const [ads, setAds] = useState<P2PAd[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('p2p_ads')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (adType) {
        query = query.eq('ad_type', adType);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch trader profiles and names for each ad
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(a => a.user_id))];
        
        const [profilesRes, tradersRes] = await Promise.all([
          supabase.from('profiles').select('user_id, full_name').in('user_id', userIds),
          supabase.from('p2p_trader_profiles').select('*').in('user_id', userIds),
        ]);

        const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p.full_name]));
        const traderMap = new Map((tradersRes.data || []).map(t => [t.user_id, t]));

        const enriched = data.map(ad => ({
          ...ad,
          ad_type: ad.ad_type as 'buy' | 'sell',
          user_name: profileMap.get(ad.user_id) || 'مستخدم',
          trader_profile: traderMap.get(ad.user_id) || null,
        }));
        
        setAds(enriched);
      } else {
        setAds([]);
      }
    } catch (error) {
      console.error('Error fetching P2P ads:', error);
    } finally {
      setLoading(false);
    }
  }, [adType]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  return { ads, loading, refetch: fetchAds };
};

export const useMyP2PAds = () => {
  const [ads, setAds] = useState<P2PAd[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchMyAds = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('p2p_ads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds((data || []).map(ad => ({ ...ad, ad_type: ad.ad_type as 'buy' | 'sell' })));
    } catch (error) {
      console.error('Error fetching my ads:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyAds();
  }, [fetchMyAds]);

  return { ads, loading, refetch: fetchMyAds };
};

export const useP2POrders = () => {
  const [orders, setOrders] = useState<P2POrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('p2p_orders')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching P2P orders:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('p2p-orders-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'p2p_orders',
      }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchOrders]);

  return { orders, loading, refetch: fetchOrders };
};

export const useP2PMessages = (orderId: string | null) => {
  const [messages, setMessages] = useState<P2PMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('p2p_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`p2p-messages-${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'p2p_messages',
        filter: `order_id=eq.${orderId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as P2PMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  return { messages, loading, refetch: fetchMessages };
};

export const useP2PActions = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const createAd = async (adData: {
    ad_type: 'buy' | 'sell';
    amount: number;
    min_amount: number;
    max_amount: number;
    price_per_unit: number;
    payment_methods: string[];
    terms?: string;
  }) => {
    if (!user) return null;

    // Ensure trader profile exists
    await supabase.from('p2p_trader_profiles').upsert({
      user_id: user.id,
    }, { onConflict: 'user_id' });

    const { data, error } = await supabase
      .from('p2p_ads')
      .insert({ ...adData, user_id: user.id })
      .select()
      .single();

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      return null;
    }

    toast({ title: 'تم إنشاء الإعلان بنجاح' });
    return data;
  };

  const createOrder = async (ad: P2PAd, amount: number, paymentMethod: string) => {
    if (!user) return null;

    const isBuyAd = ad.ad_type === 'buy';
    const buyerId = isBuyAd ? ad.user_id : user.id;
    const sellerId = isBuyAd ? user.id : ad.user_id;

    if (buyerId === sellerId) {
      toast({ title: 'خطأ', description: 'لا يمكنك التداول مع نفسك', variant: 'destructive' });
      return null;
    }

    const totalPrice = amount * ad.price_per_unit;
    const fee = totalPrice * 0.02; // 2% fee

    const { data, error } = await supabase
      .from('p2p_orders')
      .insert({
        ad_id: ad.id,
        buyer_id: buyerId,
        seller_id: sellerId,
        amount,
        total_price: totalPrice,
        payment_method: paymentMethod,
        platform_fee: fee,
        fee_percentage: 2,
        status: 'escrow_locked',
        escrow_locked_at: new Date().toISOString(),
        payment_deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      return null;
    }

    // Send system message
    await supabase.from('p2p_messages').insert({
      order_id: data.id,
      sender_id: user.id,
      message: `تم إنشاء الطلب بمبلغ ${amount} د.ج. لديكم 30 دقيقة لإتمام الدفع.`,
      is_system: true,
    });

    toast({ title: 'تم إنشاء الطلب بنجاح' });
    return data;
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    if (!user) return false;

    const updateData: Record<string, unknown> = { status };

    if (status === 'payment_sent') updateData.payment_sent_at = new Date().toISOString();
    if (status === 'payment_confirmed') updateData.payment_confirmed_at = new Date().toISOString();
    if (status === 'completed') updateData.completed_at = new Date().toISOString();
    if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
      updateData.cancelled_by = user.id;
    }

    const { error } = await supabase
      .from('p2p_orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      return false;
    }

    // System message
    const statusMessages: Record<string, string> = {
      payment_sent: '💸 تم إرسال الدفعة. في انتظار التأكيد.',
      payment_confirmed: '✅ تم تأكيد استلام الدفعة.',
      completed: '🎉 تمت الصفقة بنجاح!',
      cancelled: '❌ تم إلغاء الطلب.',
      disputed: '⚠️ تم فتح نزاع على هذا الطلب.',
    };

    if (statusMessages[status]) {
      await supabase.from('p2p_messages').insert({
        order_id: orderId,
        sender_id: user.id,
        message: statusMessages[status],
        is_system: true,
      });
    }

    return true;
  };

  const sendMessage = async (orderId: string, message: string) => {
    if (!user) return false;

    const { error } = await supabase.from('p2p_messages').insert({
      order_id: orderId,
      sender_id: user.id,
      message,
    });

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      return false;
    }

    return true;
  };

  const toggleAd = async (adId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('p2p_ads')
      .update({ is_active: isActive })
      .eq('id', adId);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  };

  const deleteAd = async (adId: string) => {
    const { error } = await supabase
      .from('p2p_ads')
      .delete()
      .eq('id', adId);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'تم حذف الإعلان' });
    return true;
  };

  return { createAd, createOrder, updateOrderStatus, sendMessage, toggleAd, deleteAd };
};
