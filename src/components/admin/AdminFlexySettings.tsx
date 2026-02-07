import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Smartphone, Save, CheckCircle } from 'lucide-react';
import { useFlexyDeposit, FlexyDepositSettings } from '@/hooks/useFlexyDeposit';

const AdminFlexySettings: React.FC = () => {
  const { settings, loading, updateSettings } = useFlexyDeposit();
  const [localSettings, setLocalSettings] = useState<FlexyDepositSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await updateSettings(localSettings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChange = (key: keyof FlexyDepositSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          إعدادات إيداع الفليكسي (موبيليس)
        </CardTitle>
        <CardDescription>
          تكوين خدمة إيداع الفليكسي عبر موبيليس - الرقم المستقبل والرسوم والحدود
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <Label className="font-semibold">تفعيل خدمة الفليكسي</Label>
            <p className="text-sm text-muted-foreground">إظهار/إخفاء خيار الفليكسي في صفحة الإيداع</p>
          </div>
          <Switch
            checked={localSettings.enabled}
            onCheckedChange={(checked) => handleChange('enabled', checked)}
          />
        </div>

        {/* Receiving Number */}
        <div className="space-y-2">
          <Label htmlFor="flexy_receiving_number" className="font-semibold">
            رقم استقبال الفليكسي (موبيليس)
          </Label>
          <Input
            id="flexy_receiving_number"
            type="tel"
            placeholder="06xxxxxxxx"
            value={localSettings.receiving_number}
            onChange={(e) => handleChange('receiving_number', e.target.value.replace(/[^\d]/g, ''))}
            maxLength={10}
            dir="ltr"
          />
          <p className="text-xs text-muted-foreground">
            هذا الرقم سيظهر للمستخدمين لإرسال الفليكسي إليه
          </p>
        </div>

        {/* Fee Percentage */}
        <div className="space-y-2">
          <Label htmlFor="flexy_fee" className="font-semibold">نسبة الرسوم (%)</Label>
          <Input
            id="flexy_fee"
            type="number"
            placeholder="5"
            value={localSettings.fee_percentage}
            onChange={(e) => handleChange('fee_percentage', parseFloat(e.target.value) || 0)}
            min={0}
            max={50}
            step={0.5}
          />
          <p className="text-xs text-muted-foreground">
            مثال: إذا كانت 5%، فإيداع 1000 د.ج سيُخصم منه 50 د.ج رسوم
          </p>
        </div>

        {/* Amount Limits */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="flexy_min" className="font-semibold">الحد الأدنى (د.ج)</Label>
            <Input
              id="flexy_min"
              type="number"
              value={localSettings.min_amount}
              onChange={(e) => handleChange('min_amount', parseInt(e.target.value) || 0)}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="flexy_max" className="font-semibold">الحد الأقصى (د.ج)</Label>
            <Input
              id="flexy_max"
              type="number"
              value={localSettings.max_amount}
              onChange={(e) => handleChange('max_amount', parseInt(e.target.value) || 0)}
              min={0}
            />
          </div>
        </div>

        {/* Daily Limit */}
        <div className="space-y-2">
          <Label htmlFor="flexy_daily" className="font-semibold">عدد الطلبات اليومية لكل مستخدم</Label>
          <Input
            id="flexy_daily"
            type="number"
            value={localSettings.daily_limit}
            onChange={(e) => handleChange('daily_limit', parseInt(e.target.value) || 1)}
            min={1}
            max={20}
          />
        </div>

        {/* Preview */}
        {localSettings.fee_percentage > 0 && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <p className="font-semibold text-sm">معاينة (لمبلغ 1000 د.ج):</p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>المبلغ المرسل:</span>
                <span>1000 د.ج</span>
              </div>
              <div className="flex justify-between text-orange-600">
                <span>الرسوم ({localSettings.fee_percentage}%):</span>
                <span>-{Math.round(1000 * localSettings.fee_percentage / 100)} د.ج</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1">
                <span>صافي المضاف:</span>
                <span>{1000 - Math.round(1000 * localSettings.fee_percentage / 100)} د.ج</span>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
        >
          {saved ? (
            <>
              <CheckCircle className="h-4 w-4 ml-2" />
              تم الحفظ
            </>
          ) : saving ? (
            'جاري الحفظ...'
          ) : (
            <>
              <Save className="h-4 w-4 ml-2" />
              حفظ إعدادات الفليكسي
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminFlexySettings;
