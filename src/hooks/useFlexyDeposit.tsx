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

/**
 * Generate a unique deposit amount by adding a small random offset.
 * The offset scales with the base amount to keep it reasonable for small deposits.
 * - 100-299 DZD → +1 to +5
 * - 300-999 DZD → +1 to +15
 * - 1000-2999 DZD → +1 to +39
 * - 3000+ DZD → +1 to +79
 */
export const generateUniqueAmount = (baseAmount: number): number => {
  let maxOffset: number;
  if (baseAmount < 300) {
    maxOffset = 5;
  } else if (baseAmount < 1000) {
    maxOffset = 15;
  } else if (baseAmount < 3000) {
    maxOffset = 39;
  } else {
    maxOffset = 79;
  }
  const offset = Math.floor(Math.random() * maxOffset) + 1;
  return baseAmount + offset;
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

  /**
   * Check if a unique amount is already used by a pending deposit today.
   */
  const isUniqueAmountAvailable = async (uniqueAmount: number): Promise<boolean> => {
    if (!user) return false;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('deposits')
        .select('id')
        .eq('payment_method', 'flexy_mobilis')
        .eq('amount', uniqueAmount)
        .in('status', ['pending'])
        .gte('created_at', todayStart.toISOString())
        .limit(1);

      return !data || data.length === 0;
    } catch {
      return true; // Allow on error to not block user
    }
  };

  /**
   * Generate a unique amount that isn't already pending today.
   */
  const getAvailableUniqueAmount = async (baseAmount: number): Promise<number> => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateUniqueAmount(baseAmount);
      const available = await isUniqueAmountAvailable(candidate);
      if (available) return candidate;
    }
    // Fallback: just return a generated one
    return generateUniqueAmount(baseAmount);
  };

  const createFlexyDeposit = async (
    senderPhone: string,
    baseAmount: number,
    uniqueAmount: number,
    receiptFile?: File
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

    if (baseAmount < settings.min_amount || baseAmount > settings.max_amount) {
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

    // Check for duplicate (same phone + same unique amount within 5 min)
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: duplicates } = await supabase
        .from('deposits')
        .select('id')
        .eq('user_id', user.id)
        .eq('payment_method', 'flexy_mobilis')
        .eq('amount', uniqueAmount)
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
      // Upload receipt image if provided
      let receiptPath: string | null = null;
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${user.id}/flexy_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('deposit-receipts')
          .upload(fileName, receiptFile);
        if (uploadError) {
          toast({
            title: 'خطأ في الرفع',
            description: 'فشل في رفع صورة التأكيد',
            variant: 'destructive',
          });
          setSubmitting(false);
          return { success: false, error: 'فشل في رفع الصورة' };
        }
        receiptPath = uploadData.path;
      }

      // Store sender phone + base amount in transaction_id for admin reference
      // Format: phone|baseAmount|uniqueAmount
      const transactionRef = `${cleaned}|${baseAmount}|${uniqueAmount}`;

      const { error } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          payment_method: 'flexy_mobilis',
          amount: uniqueAmount, // Store unique amount as the actual sent amount
          transaction_id: transactionRef,
          receipt_image: receiptPath,
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
    getAvailableUniqueAmount,
    refetch: fetchSettings,
  };
};
