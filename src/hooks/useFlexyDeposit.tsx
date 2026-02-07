import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface FlexyDepositSettings {
  enabled: boolean;
  receiving_number: string;
  fee_percentage: number;
  min_amount: number;
  max_amount: number;
  daily_limit: number;
}

const DEFAULT_SETTINGS: FlexyDepositSettings = {
  enabled: true,
  receiving_number: '',
  fee_percentage: 5,
  min_amount: 100,
  max_amount: 5000,
  daily_limit: 3,
};

export const useFlexyDeposit = () => {
  const [settings, setSettings] = useState<FlexyDepositSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'flexy_deposit_settings')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...(data.setting_value as unknown as Partial<FlexyDepositSettings>),
        });
      }
    } catch (err) {
      console.error('Error fetching flexy settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTodayCount = useCallback(async () => {
    if (!user) return;

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('deposits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('payment_method', 'flexy_mobilis')
        .gte('created_at', todayStart.toISOString());

      if (error) throw error;
      setTodayCount(count || 0);
    } catch (err) {
      console.error('Error fetching today count:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
    fetchTodayCount();
  }, [fetchSettings, fetchTodayCount]);

  const calculateFlexyFee = (amount: number) => {
    if (amount <= 0) return { fee: 0, net: 0 };
    const fee = Math.round((amount * settings.fee_percentage) / 100);
    return { fee, net: amount - fee };
  };

  const createFlexyDeposit = async (
    senderPhone: string,
    amount: number
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      toast({
        title: 'خطأ',
        description: 'يجب تسجيل الدخول أولاً',
        variant: 'destructive',
      });
      return { success: false, error: 'غير مصرح' };
    }

    // Validation
    if (!settings.enabled) {
      toast({
        title: 'الخدمة متوقفة',
        description: 'خدمة إيداع الفليكسي غير متاحة حالياً',
        variant: 'destructive',
      });
      return { success: false, error: 'الخدمة متوقفة' };
    }

    if (todayCount >= settings.daily_limit) {
      toast({
        title: 'تجاوز الحد اليومي',
        description: `لقد وصلت إلى الحد الأقصى (${settings.daily_limit} طلبات يومياً)`,
        variant: 'destructive',
      });
      return { success: false, error: 'تجاوز الحد اليومي' };
    }

    if (amount < settings.min_amount || amount > settings.max_amount) {
      toast({
        title: 'مبلغ غير صحيح',
        description: `المبلغ يجب أن يكون بين ${settings.min_amount} و ${settings.max_amount} د.ج`,
        variant: 'destructive',
      });
      return { success: false, error: 'مبلغ خارج النطاق' };
    }

    // Validate Mobilis number (06xxxxxxxx)
    const cleaned = senderPhone.replace(/\s/g, '');
    if (!/^06\d{8}$/.test(cleaned)) {
      toast({
        title: 'رقم غير صحيح',
        description: 'رقم موبيليس يجب أن يبدأ بـ 06 ويتكون من 10 أرقام',
        variant: 'destructive',
      });
      return { success: false, error: 'رقم غير صحيح' };
    }

    // Check for duplicate (same phone + same amount within 5 min)
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: duplicates } = await supabase
        .from('deposits')
        .select('id')
        .eq('user_id', user.id)
        .eq('payment_method', 'flexy_mobilis')
        .eq('amount', amount)
        .eq('transaction_id', cleaned)
        .gte('created_at', fiveMinAgo);

      if (duplicates && duplicates.length > 0) {
        toast({
          title: 'طلب مكرر',
          description: 'يوجد طلب مماثل تم إرساله مؤخراً. انتظر قليلاً قبل المحاولة مرة أخرى.',
          variant: 'destructive',
        });
        return { success: false, error: 'طلب مكرر' };
      }
    } catch (err) {
      console.error('Duplicate check error:', err);
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          payment_method: 'flexy_mobilis',
          amount,
          transaction_id: cleaned, // Store sender phone as transaction_id
          status: 'pending',
        });

      if (error) throw error;

      setTodayCount((prev) => prev + 1);

      toast({
        title: 'تم إرسال الطلب',
        description: 'تم إرسال طلب إيداع الفليكسي بنجاح. سيتم مراجعته قريباً.',
      });

      return { success: true };
    } catch (err) {
      console.error('Error creating flexy deposit:', err);
      toast({
        title: 'خطأ',
        description: 'فشل في إرسال طلب الإيداع',
        variant: 'destructive',
      });
      return { success: false, error: 'فشل في الإرسال' };
    } finally {
      setSubmitting(false);
    }
  };

  const updateSettings = async (newSettings: FlexyDepositSettings) => {
    try {
      // Upsert settings
      const { data: existing } = await supabase
        .from('platform_settings')
        .select('id')
        .eq('setting_key', 'flexy_deposit_settings')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('platform_settings')
          .update({ setting_value: newSettings as any, updated_at: new Date().toISOString() })
          .eq('setting_key', 'flexy_deposit_settings');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platform_settings')
          .insert({
            setting_key: 'flexy_deposit_settings',
            setting_value: newSettings as any,
            description: 'إعدادات إيداع الفليكسي',
          });
        if (error) throw error;
      }

      setSettings(newSettings);
      toast({
        title: 'تم الحفظ',
        description: 'تم تحديث إعدادات الفليكسي بنجاح',
      });
    } catch (err) {
      console.error('Error updating flexy settings:', err);
      toast({
        title: 'خطأ',
        description: 'فشل في حفظ الإعدادات',
        variant: 'destructive',
      });
    }
  };

  return {
    settings,
    loading,
    submitting,
    todayCount,
    calculateFlexyFee,
    createFlexyDeposit,
    updateSettings,
    refetch: fetchSettings,
  };
};
