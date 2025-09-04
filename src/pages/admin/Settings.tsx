import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  Settings as SettingsIcon, 
  CreditCard,
  Shield,
  Mail,
  Bell,
  DollarSign,
  Percent,
  Clock,
  Save
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = React.useState({
    // General Settings
    platform_name: 'OpaY الجزائر',
    platform_description: 'محفظة إلكترونية آمنة وسهلة',
    support_email: 'support@opay-dz.com',
    support_phone: '0800123456',
    
    // Payment Settings
    min_deposit: 1000,
    max_deposit: 500000,
    min_withdrawal: 500,
    max_withdrawal: 200000,
    withdrawal_fee: 50,
    transfer_fee: 25,
    
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

  const [saved, setSaved] = React.useState(false);

  const handleInputChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    // هنا سيتم حفظ الإعدادات في قاعدة البيانات
    console.log('Saving settings:', settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إعدادات النظام</h1>
          <p className="text-muted-foreground mt-2">
            إدارة إعدادات المنصة والتحكم في السلوكيات العامة
          </p>
        </div>
        <Button onClick={handleSave} className="bg-gradient-primary">
          <Save className="w-4 h-4 mr-2" />
          {saved ? 'تم الحفظ!' : 'حفظ التغييرات'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              إعدادات الدفع
            </CardTitle>
            <CardDescription>
              حدود وعمولات العمليات المالية
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="withdrawal_fee">عمولة السحب (دج)</Label>
                <Input
                  id="withdrawal_fee"
                  type="number"
                  value={settings.withdrawal_fee}
                  onChange={(e) => handleInputChange('withdrawal_fee', parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="transfer_fee">عمولة التحويل (دج)</Label>
                <Input
                  id="transfer_fee"
                  type="number"
                  value={settings.transfer_fee}
                  onChange={(e) => handleInputChange('transfer_fee', parseInt(e.target.value))}
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
      </div>
    </div>
  );
}