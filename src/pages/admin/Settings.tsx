import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Settings as SettingsIcon, 
  CreditCard,
  Shield,
  Mail,
  Bell,
  DollarSign,
  Percent,
  Clock,
  Save,
  PiggyBank,
  TrendingUp,
  Calculator,
  AlertCircle,
  Calendar,
  Globe2
} from 'lucide-react';

interface FeeConfig {
  percentage: number;
  fixed_amount: number;
  min_fee: number;
  max_fee: number;
  enabled: boolean;
  paid_by?: string;
}

interface FeeSettings {
  deposit_fees: FeeConfig;
  withdrawal_fees: FeeConfig;
  transfer_fees: FeeConfig & { paid_by: string };
}

export default function SettingsPage() {
  const [settings, setSettings] = React.useState({
    // General Settings
    platform_name: 'OpaY الجزائر',
    platform_description: 'محفظة إلكترونية آمنة وسهلة',
    support_email: 'support@opay-dz.com',
    support_phone: '0800123456',
    
    // Payment Limits
    min_deposit: 1000,
    max_deposit: 500000,
    min_withdrawal: 500,
    max_withdrawal: 200000,
    
    // Verification Settings
    phone_verification_enabled: true,
    identity_verification_enabled: true,
    auto_approval_enabled: false,
    verification_expiry_hours: 24,
    
    // Notification Settings
    email_notifications: true,
    sms_notifications: true,
    admin_notifications: true,
    
    // Security Settings
    max_login_attempts: 5,
    session_timeout_minutes: 30,
    two_factor_required: false,
    
    // Business Settings
    card_markup_percentage: 15,
    maintenance_mode: false,
    maintenance_message: 'النظام قيد الصيانة. سنعود قريباً.'
  });

  const [feeSettings, setFeeSettings] = React.useState<FeeSettings>({
    deposit_fees: {
      percentage: 0.5,
      fixed_amount: 0,
      min_fee: 10,
      max_fee: 500,
      enabled: true
    },
    withdrawal_fees: {
      percentage: 1.5,
      fixed_amount: 20,
      min_fee: 20,
      max_fee: 1000,
      enabled: true
    },
    transfer_fees: {
      percentage: 0.5,
      fixed_amount: 0,
      min_fee: 5,
      max_fee: 200,
      enabled: true,
      paid_by: 'sender'
    }
  });

  const [walletSettings, setWalletSettings] = React.useState({
    baridimob: '0551234567',
    ccp: '1234567890123',
    edahabiya: '0987654321'
  });

  const [diasporaSettings, setDiasporaSettings] = React.useState({
    enabled: true,
    default_exchange_rate: 280,
    revolut: {
      account_name: 'OpaY Services',
      account_number: 'GB29 REVO 0099 6900 1234 56',
      bic: 'REVOGB21',
      currency: 'EUR/USD'
    },
    wise: {
      account_name: 'OpaY International',
      account_number: 'BE68 5390 0754 7034',
      bic: 'TRWIBEB1XXX',
      currency: 'EUR/USD'
    },
    paysera: {
      account_name: 'OpaY Transfer',
      account_number: 'LT12 3456 7890 1234 5678',
      bic: 'EVIULT2VXXX',
      currency: 'EUR'
    }
  });

  const [platformRevenue, setPlatformRevenue] = React.useState({
    total_revenue: 0,
    monthly_revenue: 0,
    deposit_fees_total: 0,
    withdrawal_fees_total: 0,
    transfer_fees_total: 0
  });

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  // Load fee settings on component mount
  React.useEffect(() => {
    const loadFeeSettings = async () => {
      try {
        const { data: settingsData, error } = await supabase
          .from('platform_settings')
          .select('*')
          .in('setting_key', ['deposit_fees', 'withdrawal_fees', 'transfer_fees']);

        if (error) throw error;

        if (settingsData && settingsData.length > 0) {
          const newFeeSettings: any = {};
          settingsData.forEach(setting => {
            newFeeSettings[setting.setting_key] = setting.setting_value;
          });
          setFeeSettings(prev => ({ ...prev, ...newFeeSettings }));
        }

        // Load platform revenue
        const { data: revenueData, error: revenueError } = await supabase
          .from('platform_ledger')
          .select('transaction_type, fee_amount, created_at');

        if (revenueError) throw revenueError;

        if (revenueData) {
          const totalRevenue = revenueData.reduce((sum, item) => sum + Number(item.fee_amount), 0);
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();
          
          const monthlyRevenue = revenueData
            .filter(item => {
              const itemDate = new Date(item.created_at);
              return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
            })
            .reduce((sum, item) => sum + Number(item.fee_amount), 0);

          const depositFeesTotal = revenueData
            .filter(item => item.transaction_type === 'deposit_fee')
            .reduce((sum, item) => sum + Number(item.fee_amount), 0);

          const withdrawalFeesTotal = revenueData
            .filter(item => item.transaction_type === 'withdrawal_fee')
            .reduce((sum, item) => sum + Number(item.fee_amount), 0);

          const transferFeesTotal = revenueData
            .filter(item => item.transaction_type === 'transfer_fee')
            .reduce((sum, item) => sum + Number(item.fee_amount), 0);

          setPlatformRevenue({
            total_revenue: totalRevenue,
            monthly_revenue: monthlyRevenue,
            deposit_fees_total: depositFeesTotal,
            withdrawal_fees_total: withdrawalFeesTotal,
            transfer_fees_total: transferFeesTotal
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeeSettings();
  }, []);

  // Load wallet settings
  React.useEffect(() => {
    const loadWalletSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('platform_settings')
          .select('setting_value')
          .eq('setting_key', 'payment_wallets')
          .single();

        if (error) throw error;

        if (data?.setting_value) {
          setWalletSettings(data.setting_value as any);
        }
      } catch (error) {
        console.error('Error loading wallet settings:', error);
      }
    };

    loadWalletSettings();
  }, []);

  // Load diaspora settings
  React.useEffect(() => {
    const loadDiasporaSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('platform_settings')
          .select('setting_value')
          .eq('setting_key', 'diaspora_settings')
          .maybeSingle();

        if (error) throw error;

        if (data?.setting_value) {
          const dbSettings = data.setting_value as any;
          
          // Convert bank_accounts array format to individual account format
          if (dbSettings.bank_accounts && Array.isArray(dbSettings.bank_accounts)) {
            const findAccount = (name: string) => 
              dbSettings.bank_accounts.find((acc: any) => 
                acc.name?.toLowerCase() === name.toLowerCase()
              ) || { account_name: '', account_number: '', bic: '', currency: '' };
            
            setDiasporaSettings({
              enabled: dbSettings.enabled ?? true,
              default_exchange_rate: dbSettings.default_exchange_rate ?? 280,
              revolut: findAccount('revolut'),
              wise: findAccount('wise'),
              paysera: findAccount('paysera')
            });
          } else if (dbSettings.revolut && dbSettings.wise && dbSettings.paysera) {
            // Already in the expected format
            setDiasporaSettings(dbSettings);
          }
        }
      } catch (error) {
        console.error('Error loading diaspora settings:', error);
      }
    };

    loadDiasporaSettings();
  }, []);

  const handleInputChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleFeeSettingChange = (feeType: keyof FeeSettings, key: string, value: any) => {
    setFeeSettings(prev => ({
      ...prev,
      [feeType]: {
        ...prev[feeType],
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save fee settings to database
      const feeUpdates = Object.entries(feeSettings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
        description: key === 'deposit_fees' ? 'إعدادات رسوم الإيداع' :
                    key === 'withdrawal_fees' ? 'إعدادات رسوم السحب' :
                    'إعدادات رسوم التحويل'
      }));

      for (const update of feeUpdates) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert(update, { onConflict: 'setting_key' });
        
        if (error) throw error;
      }

      console.log('Settings saved successfully');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWallets = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          setting_key: 'payment_wallets',
          setting_value: walletSettings as any,
          description: 'أرقام محافظ الإيداع للطرق المختلفة'
        }, { onConflict: 'setting_key' });
      
      if (error) throw error;

      console.log('Wallet settings saved successfully');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving wallet settings:', error);
      alert('خطأ في حفظ إعدادات المحافظ');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDiasporaSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          setting_key: 'diaspora_settings',
          setting_value: diasporaSettings as any,
          description: 'إعدادات خدمة الجالية والحسابات البنكية'
        }, { onConflict: 'setting_key' });
      
      if (error) throw error;

      console.log('Diaspora settings saved successfully');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving diaspora settings:', error);
      alert('خطأ في حفظ إعدادات الجالية');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculateFeePreview = (amount: number, config: FeeConfig) => {
    if (!config.enabled) return { fee: 0, net: amount };
    
    let fee = (amount * config.percentage / 100) + config.fixed_amount;
    fee = Math.max(fee, config.min_fee);
    fee = Math.min(fee, config.max_fee);
    
    return { fee: Math.round(fee), net: amount - Math.round(fee) };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid gap-4 lg:grid-cols-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إعدادات النظام</h1>
          <p className="text-muted-foreground mt-2">
            إدارة إعدادات المنصة والتحكم في الرسوم والأرباح
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'جاري الحفظ...' : saved ? 'تم الحفظ!' : 'حفظ التغييرات'}
        </Button>
      </div>

      {/* Platform Revenue Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأرباح</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(platformRevenue.total_revenue)}
            </div>
            <p className="text-xs text-muted-foreground">جميع الرسوم المحصلة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">أرباح هذا الشهر</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(platformRevenue.monthly_revenue)}
            </div>
            <p className="text-xs text-muted-foreground">الشهر الحالي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">رسوم الإيداع</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(platformRevenue.deposit_fees_total)}
            </div>
            <p className="text-xs text-muted-foreground">إجمالي رسوم الإيداع</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">رسوم السحب والتحويل</CardTitle>
            <Percent className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(platformRevenue.withdrawal_fees_total + platformRevenue.transfer_fees_total)}
            </div>
            <p className="text-xs text-muted-foreground">رسوم السحب + التحويل</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fee Settings - Deposit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5" />
              رسوم الإيداع
            </CardTitle>
            <CardDescription>
              إعدادات رسوم الإيداع والحدود
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>تفعيل رسوم الإيداع</Label>
                <p className="text-sm text-muted-foreground">تطبيق رسوم على عمليات الإيداع</p>
              </div>
              <Switch
                checked={feeSettings.deposit_fees.enabled}
                onCheckedChange={(checked) => handleFeeSettingChange('deposit_fees', 'enabled', checked)}
              />
            </div>

            {feeSettings.deposit_fees.enabled && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نسبة مئوية (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={feeSettings.deposit_fees.percentage}
                      onChange={(e) => handleFeeSettingChange('deposit_fees', 'percentage', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>مبلغ ثابت (دج)</Label>
                    <Input
                      type="number"
                      value={feeSettings.deposit_fees.fixed_amount}
                      onChange={(e) => handleFeeSettingChange('deposit_fees', 'fixed_amount', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>حد أدنى للرسوم (دج)</Label>
                    <Input
                      type="number"
                      value={feeSettings.deposit_fees.min_fee}
                      onChange={(e) => handleFeeSettingChange('deposit_fees', 'min_fee', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>حد أقصى للرسوم (دج)</Label>
                    <Input
                      type="number"
                      value={feeSettings.deposit_fees.max_fee}
                      onChange={(e) => handleFeeSettingChange('deposit_fees', 'max_fee', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Fee Preview */}
                <div className="bg-muted/30 p-3 rounded-md">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    معاينة الرسوم
                  </h4>
                  <div className="space-y-1 text-xs">
                    {[1000, 10000, 50000].map(amount => {
                      const preview = calculateFeePreview(amount, feeSettings.deposit_fees);
                      return (
                        <div key={amount} className="flex justify-between">
                          <span>إيداع {formatCurrency(amount)}:</span>
                          <span>رسوم {formatCurrency(preview.fee)} | صافي {formatCurrency(preview.net)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fee Settings - Withdrawal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              رسوم السحب
            </CardTitle>
            <CardDescription>
              إعدادات رسوم السحب والحدود
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>تفعيل رسوم السحب</Label>
                <p className="text-sm text-muted-foreground">تطبيق رسوم على عمليات السحب</p>
              </div>
              <Switch
                checked={feeSettings.withdrawal_fees.enabled}
                onCheckedChange={(checked) => handleFeeSettingChange('withdrawal_fees', 'enabled', checked)}
              />
            </div>

            {feeSettings.withdrawal_fees.enabled && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نسبة مئوية (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={feeSettings.withdrawal_fees.percentage}
                      onChange={(e) => handleFeeSettingChange('withdrawal_fees', 'percentage', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>مبلغ ثابت (دج)</Label>
                    <Input
                      type="number"
                      value={feeSettings.withdrawal_fees.fixed_amount}
                      onChange={(e) => handleFeeSettingChange('withdrawal_fees', 'fixed_amount', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>حد أدنى للرسوم (دج)</Label>
                    <Input
                      type="number"
                      value={feeSettings.withdrawal_fees.min_fee}
                      onChange={(e) => handleFeeSettingChange('withdrawal_fees', 'min_fee', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>حد أقصى للرسوم (دج)</Label>
                    <Input
                      type="number"
                      value={feeSettings.withdrawal_fees.max_fee}
                      onChange={(e) => handleFeeSettingChange('withdrawal_fees', 'max_fee', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Fee Preview */}
                <div className="bg-muted/30 p-3 rounded-md">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    معاينة الرسوم
                  </h4>
                  <div className="space-y-1 text-xs">
                    {[1000, 10000, 50000].map(amount => {
                      const preview = calculateFeePreview(amount, feeSettings.withdrawal_fees);
                      return (
                        <div key={amount} className="flex justify-between">
                          <span>سحب {formatCurrency(amount)}:</span>
                          <span>رسوم {formatCurrency(preview.fee)} | إجمالي {formatCurrency(amount + preview.fee)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fee Settings - Transfer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              رسوم التحويل
            </CardTitle>
            <CardDescription>
              إعدادات رسوم التحويل بين المستخدمين
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>تفعيل رسوم التحويل</Label>
                <p className="text-sm text-muted-foreground">تطبيق رسوم على التحويلات</p>
              </div>
              <Switch
                checked={feeSettings.transfer_fees.enabled}
                onCheckedChange={(checked) => handleFeeSettingChange('transfer_fees', 'enabled', checked)}
              />
            </div>

            {feeSettings.transfer_fees.enabled && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>من يدفع الرسوم؟</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={feeSettings.transfer_fees.paid_by === 'sender' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFeeSettingChange('transfer_fees', 'paid_by', 'sender')}
                      className="flex-1"
                    >
                      المرسل
                    </Button>
                    <Button
                      variant={feeSettings.transfer_fees.paid_by === 'recipient' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFeeSettingChange('transfer_fees', 'paid_by', 'recipient')}
                      className="flex-1"
                    >
                      المستلم
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نسبة مئوية (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={feeSettings.transfer_fees.percentage}
                      onChange={(e) => handleFeeSettingChange('transfer_fees', 'percentage', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>مبلغ ثابت (دج)</Label>
                    <Input
                      type="number"
                      value={feeSettings.transfer_fees.fixed_amount}
                      onChange={(e) => handleFeeSettingChange('transfer_fees', 'fixed_amount', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>حد أدنى للرسوم (دج)</Label>
                    <Input
                      type="number"
                      value={feeSettings.transfer_fees.min_fee}
                      onChange={(e) => handleFeeSettingChange('transfer_fees', 'min_fee', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>حد أقصى للرسوم (دج)</Label>
                    <Input
                      type="number"
                      value={feeSettings.transfer_fees.max_fee}
                      onChange={(e) => handleFeeSettingChange('transfer_fees', 'max_fee', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Fee Preview */}
                <div className="bg-muted/30 p-3 rounded-md">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    معاينة الرسوم ({feeSettings.transfer_fees.paid_by === 'sender' ? 'المرسل يدفع' : 'المستلم يدفع'})
                  </h4>
                  <div className="space-y-1 text-xs">
                    {[500, 2000, 10000].map(amount => {
                      const preview = calculateFeePreview(amount, feeSettings.transfer_fees);
                      return (
                        <div key={amount} className="flex justify-between">
                          <span>تحويل {formatCurrency(amount)}:</span>
                          <span>رسوم {formatCurrency(preview.fee)} | يستلم {formatCurrency(preview.net)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Wallets Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              إدارة محافظ الإيداع
            </CardTitle>
            <CardDescription>
              إعدادات أرقام المحافظ للطرق المختلفة للإيداع
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baridimob_wallet">محفظة Baridimob</Label>
              <Input
                id="baridimob_wallet"
                value={walletSettings.baridimob}
                onChange={(e) => setWalletSettings({...walletSettings, baridimob: e.target.value})}
                placeholder="رقم محفظة Baridimob"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ccp_wallet">محفظة CCP</Label>
              <Input
                id="ccp_wallet"
                value={walletSettings.ccp}
                onChange={(e) => setWalletSettings({...walletSettings, ccp: e.target.value})}
                placeholder="رقم حساب CCP"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edahabiya_wallet">محفظة الذهبية</Label>
              <Input
                id="edahabiya_wallet"
                value={walletSettings.edahabiya}
                onChange={(e) => setWalletSettings({...walletSettings, edahabiya: e.target.value})}
                placeholder="رقم محفظة الذهبية"
              />
            </div>
            
            <Button 
              onClick={handleSaveWallets} 
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  حفظ إعدادات المحافظ
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              الإعدادات العامة
            </CardTitle>
            <CardDescription>
              معلومات المنصة الأساسية
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform_name">اسم المنصة</Label>
              <Input
                id="platform_name"
                value={settings.platform_name}
                onChange={(e) => handleInputChange('platform_name', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="platform_description">وصف المنصة</Label>
              <Textarea
                id="platform_description"
                value={settings.platform_description}
                onChange={(e) => handleInputChange('platform_description', e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="support_email">بريد الدعم الفني</Label>
              <Input
                id="support_email"
                type="email"
                value={settings.support_email}
                onChange={(e) => handleInputChange('support_email', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="support_phone">هاتف الدعم الفني</Label>
              <Input
                id="support_phone"
                value={settings.support_phone}
                onChange={(e) => handleInputChange('support_phone', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              حدود العمليات المالية
            </CardTitle>
            <CardDescription>
              الحدود الدنيا والعليا للمعاملات
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_deposit">أقل إيداع (دج)</Label>
                <Input
                  id="min_deposit"
                  type="number"
                  value={settings.min_deposit}
                  onChange={(e) => handleInputChange('min_deposit', parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max_deposit">أكبر إيداع (دج)</Label>
                <Input
                  id="max_deposit"
                  type="number"
                  value={settings.max_deposit}
                  onChange={(e) => handleInputChange('max_deposit', parseInt(e.target.value))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_withdrawal">أقل سحب (دج)</Label>
                <Input
                  id="min_withdrawal"
                  type="number"
                  value={settings.min_withdrawal}
                  onChange={(e) => handleInputChange('min_withdrawal', parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max_withdrawal">أكبر سحب (دج)</Label>
                <Input
                  id="max_withdrawal"
                  type="number"
                  value={settings.max_withdrawal}
                  onChange={(e) => handleInputChange('max_withdrawal', parseInt(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              إعدادات التحقق
            </CardTitle>
            <CardDescription>
              إعدادات عمليات التحقق والتفعيل
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>تفعيل تحقق الهاتف</Label>
                <p className="text-sm text-muted-foreground">
                  يتطلب تحقق رقم الهاتف للمستخدمين الجدد
                </p>
              </div>
              <Switch
                checked={settings.phone_verification_enabled}
                onCheckedChange={(checked) => handleInputChange('phone_verification_enabled', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>تفعيل تحقق الهوية</Label>
                <p className="text-sm text-muted-foreground">
                  يتطلب رفع صور الهوية للتفعيل الكامل
                </p>
              </div>
              <Switch
                checked={settings.identity_verification_enabled}
                onCheckedChange={(checked) => handleInputChange('identity_verification_enabled', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>الموافقة التلقائية</Label>
                <p className="text-sm text-muted-foreground">
                  موافقة تلقائية على طلبات التحقق (غير منصوح)
                </p>
              </div>
              <Switch
                checked={settings.auto_approval_enabled}
                onCheckedChange={(checked) => handleInputChange('auto_approval_enabled', checked)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="verification_expiry">مدة انتهاء التحقق (ساعات)</Label>
              <Input
                id="verification_expiry"
                type="number"
                value={settings.verification_expiry_hours}
                onChange={(e) => handleInputChange('verification_expiry_hours', parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              إعدادات الإشعارات
            </CardTitle>
            <CardDescription>
              إدارة الإشعارات والتنبيهات
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>إشعارات البريد الإلكتروني</Label>
                <p className="text-sm text-muted-foreground">
                  إرسال إشعارات عبر البريد الإلكتروني
                </p>
              </div>
              <Switch
                checked={settings.email_notifications}
                onCheckedChange={(checked) => handleInputChange('email_notifications', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>إشعارات الرسائل القصيرة</Label>
                <p className="text-sm text-muted-foreground">
                  إرسال إشعارات عبر SMS
                </p>
              </div>
              <Switch
                checked={settings.sms_notifications}
                onCheckedChange={(checked) => handleInputChange('sms_notifications', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>إشعارات الإدارة</Label>
                <p className="text-sm text-muted-foreground">
                  إشعار المديرين بالأحداث المهمة
                </p>
              </div>
              <Switch
                checked={settings.admin_notifications}
                onCheckedChange={(checked) => handleInputChange('admin_notifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              إعدادات الأمان
            </CardTitle>
            <CardDescription>
              إعدادات الحماية والأمان
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_login_attempts">أقصى محاولات دخول</Label>
                <Input
                  id="max_login_attempts"
                  type="number"
                  value={settings.max_login_attempts}
                  onChange={(e) => handleInputChange('max_login_attempts', parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="session_timeout">انتهاء الجلسة (دقائق)</Label>
                <Input
                  id="session_timeout"
                  type="number"
                  value={settings.session_timeout_minutes}
                  onChange={(e) => handleInputChange('session_timeout_minutes', parseInt(e.target.value))}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>المصادقة الثنائية إجبارية</Label>
                <p className="text-sm text-muted-foreground">
                  يتطلب تفعيل المصادقة الثنائية لجميع المستخدمين
                </p>
              </div>
              <Switch
                checked={settings.two_factor_required}
                onCheckedChange={(checked) => handleInputChange('two_factor_required', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Business Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              إعدادات العمل
            </CardTitle>
            <CardDescription>
              إعدادات الأعمال والصيانة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="card_markup">نسبة الربح على البطاقات (%)</Label>
              <Input
                id="card_markup"
                type="number"
                step="0.1"
                value={settings.card_markup_percentage}
                onChange={(e) => handleInputChange('card_markup_percentage', parseFloat(e.target.value))}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>وضع الصيانة</Label>
                <p className="text-sm text-muted-foreground">
                  تفعيل وضع الصيانة لإيقاف الخدمات مؤقتاً
                </p>
              </div>
              <Switch
                checked={settings.maintenance_mode}
                onCheckedChange={(checked) => handleInputChange('maintenance_mode', checked)}
              />
            </div>
            
            {settings.maintenance_mode && (
              <div className="space-y-2">
                <Label htmlFor="maintenance_message">رسالة الصيانة</Label>
                <Textarea
                  id="maintenance_message"
                  value={settings.maintenance_message}
                  onChange={(e) => handleInputChange('maintenance_message', e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diaspora Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="h-5 w-5" />
              إعدادات خدمة الجالية
            </CardTitle>
            <CardDescription>
              إدارة الحسابات البنكية وإعدادات تحويلات الجالية
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable Service */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="space-y-0.5">
                <Label>تفعيل خدمة الجالية</Label>
                <p className="text-sm text-muted-foreground">
                  السماح بتحويلات الجالية الجزائرية من الخارج
                </p>
              </div>
              <Switch
                checked={diasporaSettings.enabled}
                onCheckedChange={(checked) => setDiasporaSettings(prev => ({ ...prev, enabled: checked }))}
              />
            </div>

            {diasporaSettings.enabled && (
              <>
                {/* Default Exchange Rate */}
                <div className="space-y-2">
                  <Label htmlFor="default_exchange_rate">سعر الصرف الافتراضي (1 USD/EUR = ... DZD)</Label>
                  <Input
                    id="default_exchange_rate"
                    type="number"
                    step="0.01"
                    value={diasporaSettings.default_exchange_rate}
                    onChange={(e) => setDiasporaSettings(prev => ({ 
                      ...prev, 
                      default_exchange_rate: parseFloat(e.target.value) || 0 
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    سيتم استخدام هذا السعر كقيمة افتراضية عند الموافقة على الطلبات
                  </p>
                </div>

                <Separator />

                {/* Revolut Account */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    حساب Revolut
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم الحساب</Label>
                      <Input
                        value={diasporaSettings.revolut.account_name}
                        onChange={(e) => setDiasporaSettings(prev => ({
                          ...prev,
                          revolut: { ...prev.revolut, account_name: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم الحساب / IBAN</Label>
                      <Input
                        value={diasporaSettings.revolut.account_number}
                        onChange={(e) => setDiasporaSettings(prev => ({
                          ...prev,
                          revolut: { ...prev.revolut, account_number: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>BIC / SWIFT</Label>
                      <Input
                        value={diasporaSettings.revolut.bic}
                        onChange={(e) => setDiasporaSettings(prev => ({
                          ...prev,
                          revolut: { ...prev.revolut, bic: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>العملة</Label>
                      <Input
                        value={diasporaSettings.revolut.currency}
                        onChange={(e) => setDiasporaSettings(prev => ({
                          ...prev,
                          revolut: { ...prev.revolut, currency: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Wise Account */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    حساب Wise
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم الحساب</Label>
                      <Input
                        value={diasporaSettings.wise.account_name}
                        onChange={(e) => setDiasporaSettings(prev => ({
                          ...prev,
                          wise: { ...prev.wise, account_name: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم الحساب / IBAN</Label>
                      <Input
                        value={diasporaSettings.wise.account_number}
                        onChange={(e) => setDiasporaSettings(prev => ({
                          ...prev,
                          wise: { ...prev.wise, account_number: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>BIC / SWIFT</Label>
                      <Input
                        value={diasporaSettings.wise.bic}
                        onChange={(e) => setDiasporaSettings(prev => ({
                          ...prev,
                          wise: { ...prev.wise, bic: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>العملة</Label>
                      <Input
                        value={diasporaSettings.wise.currency}
                        onChange={(e) => setDiasporaSettings(prev => ({
                          ...prev,
                          wise: { ...prev.wise, currency: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Paysera Account */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    حساب Paysera
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم الحساب</Label>
                      <Input
                        value={diasporaSettings.paysera.account_name}
                        onChange={(e) => setDiasporaSettings(prev => ({
                          ...prev,
                          paysera: { ...prev.paysera, account_name: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم الحساب / IBAN</Label>
                      <Input
                        value={diasporaSettings.paysera.account_number}
                        onChange={(e) => setDiasporaSettings(prev => ({
                          ...prev,
                          paysera: { ...prev.paysera, account_number: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>BIC / SWIFT</Label>
                      <Input
                        value={diasporaSettings.paysera.bic}
                        onChange={(e) => setDiasporaSettings(prev => ({
                          ...prev,
                          paysera: { ...prev.paysera, bic: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>العملة</Label>
                      <Input
                        value={diasporaSettings.paysera.currency}
                        onChange={(e) => setDiasporaSettings(prev => ({
                          ...prev,
                          paysera: { ...prev.paysera, currency: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleSaveDiasporaSettings}
                    disabled={saving}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    حفظ إعدادات الجالية
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform Revenue Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            تحليلات الأرباح
          </CardTitle>
          <CardDescription>
            عرض تفصيلي لأرباح المنصة من الرسوم
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <PiggyBank className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">رسوم الإيداع</span>
              </div>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(platformRevenue.deposit_fees_total)}
              </div>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-800">رسوم السحب</span>
              </div>
              <div className="text-xl font-bold text-orange-600">
                {formatCurrency(platformRevenue.withdrawal_fees_total)}
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">رسوم التحويل</span>
              </div>
              <div className="text-xl font-bold text-blue-600">
                {formatCurrency(platformRevenue.transfer_fees_total)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}