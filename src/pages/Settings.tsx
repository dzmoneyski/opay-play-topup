import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, User, Phone, Mail, Shield, Bell, Lock, ChevronLeft } from "lucide-react";
import BackButton from "@/components/BackButton";
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, refetch } = useProfile();
  const { toast } = useToast();
  
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone
        })
        .eq("user_id", user.id);

      if (error) throw error;

      await refetch();
      
      toast({
        title: "تم تحديث الملف الشخصي",
        description: "تم حفظ التغييرات بنجاح",
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-hero border-b border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BackButton />
              <div>
                <h1 className="text-2xl font-bold text-white">الإعدادات</h1>
                <p className="text-white/70 text-sm">إدارة حسابك وتفضيلاتك</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-4">
        {/* Account Information */}
        <Card className="bg-gradient-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              معلومات الحساب
            </CardTitle>
            <CardDescription>تحديث بياناتك الشخصية</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الكامل</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="أدخل اسمك الكامل"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <div className="relative">
                <Phone className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0555123456"
                  className="pr-10"
                  disabled={profile?.is_phone_verified}
                />
              </div>
              {profile?.is_phone_verified && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  رقم موثق
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="pr-10 bg-muted/50"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                لا يمكن تغيير البريد الإلكتروني
              </p>
            </div>

            <Button 
              onClick={handleUpdateProfile} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card className="bg-gradient-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              حالة الحساب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">التحقق من الهاتف</span>
              </div>
              <div className={`text-xs font-medium px-2 py-1 rounded ${
                profile?.is_phone_verified 
                  ? 'bg-green-500/20 text-green-500' 
                  : 'bg-yellow-500/20 text-yellow-500'
              }`}>
                {profile?.is_phone_verified ? 'مكتمل' : 'غير مكتمل'}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">التحقق من الهوية</span>
              </div>
              <div className={`text-xs font-medium px-2 py-1 rounded ${
                profile?.is_identity_verified 
                  ? 'bg-green-500/20 text-green-500' 
                  : 'bg-yellow-500/20 text-yellow-500'
              }`}>
                {profile?.is_identity_verified ? 'مكتمل' : 'غير مكتمل'}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">تفعيل الحساب</span>
              </div>
              <div className={`text-xs font-medium px-2 py-1 rounded ${
                profile?.is_account_activated 
                  ? 'bg-green-500/20 text-green-500' 
                  : 'bg-red-500/20 text-red-500'
              }`}>
                {profile?.is_account_activated ? 'مفعل' : 'غير مفعل'}
              </div>
            </div>

            {!profile?.is_account_activated && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/activate')}
              >
                تفعيل الحساب الآن
                <ChevronLeft className="mr-2 h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-gradient-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              الإشعارات
            </CardTitle>
            <CardDescription>إدارة تفضيلات الإشعارات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>إشعارات المعاملات</Label>
                <p className="text-xs text-muted-foreground">
                  احصل على تنبيهات عند إتمام المعاملات
                </p>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Actions */}
        <Card className="bg-gradient-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              الأمان
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => {
                toast({
                  title: "قريباً",
                  description: "هذه الميزة ستكون متاحة قريباً",
                });
              }}
            >
              تغيير كلمة المرور
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
