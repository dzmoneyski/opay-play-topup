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
import { ArrowRight, User, Phone, Mail, Shield, Bell, Lock, ChevronLeft, CheckCircle2, AlertCircle, Settings as SettingsIcon, Key, HelpCircle, FileText, LogOut } from "lucide-react";
import BackButton from "@/components/BackButton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
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
      {/* Professional Header with Gradient */}
      <header className="relative bg-gradient-hero overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glass"></div>
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BackButton variant="default" />
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                    <SettingsIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">الإعدادات</h1>
                    <p className="text-white/80 text-sm">إدارة حسابك وتخصيص تجربتك</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                نشط الآن
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-6 -mt-8 relative z-10">
        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          <Card className="bg-gradient-card border-white/10 shadow-card hover:shadow-elevated transition-all duration-300 hover:scale-105">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">حالة الحساب</p>
                  <p className={`text-lg font-bold ${profile?.is_account_activated ? 'text-green-500' : 'text-yellow-500'}`}>
                    {profile?.is_account_activated ? 'مفعل' : 'غير مفعل'}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  profile?.is_account_activated 
                    ? 'bg-green-500/20' 
                    : 'bg-yellow-500/20'
                }`}>
                  {profile?.is_account_activated ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-yellow-500" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-white/10 shadow-card hover:shadow-elevated transition-all duration-300 hover:scale-105">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">التحقق</p>
                  <p className="text-lg font-bold text-foreground">
                    {(profile?.is_phone_verified ? 1 : 0) + (profile?.is_identity_verified ? 1 : 0)}/2
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-white/10 shadow-card hover:shadow-elevated transition-all duration-300 hover:scale-105">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">البريد الإلكتروني</p>
                  <p className="text-lg font-bold text-green-500">موثق</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Information */}
        <Card className="bg-gradient-card border-white/10 shadow-card animate-slide-up">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle>معلومات الحساب</CardTitle>
                  <CardDescription>تحديث بياناتك الشخصية</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                الاسم الكامل
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="أدخل اسمك الكامل"
                className="bg-muted/50 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                رقم الهاتف
              </Label>
              <div className="relative">
                <Phone className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0555123456"
                  className="pr-10 bg-muted/50 border-white/10"
                  disabled={profile?.is_phone_verified}
                />
                {profile?.is_phone_verified && (
                  <CheckCircle2 className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                )}
              </div>
              {profile?.is_phone_verified && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  رقم موثق ومحمي
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                البريد الإلكتروني
              </Label>
              <div className="relative">
                <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="pr-10 bg-muted/50 border-white/10"
                />
                <CheckCircle2 className="absolute left-3 top-3 h-4 w-4 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground">
                البريد الإلكتروني محمي ولا يمكن تغييره
              </p>
            </div>

            <Button 
              onClick={handleUpdateProfile} 
              disabled={loading}
              className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-105 shadow-soft"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                  حفظ التغييرات
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Account Status with Better Design */}
        <Card className="bg-gradient-card border-white/10 shadow-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-secondary flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>حالة التحقق والأمان</CardTitle>
                <CardDescription>تفاصيل التحقق من الحساب</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gradient-glass backdrop-blur-sm rounded-xl border border-white/10 transition-all duration-300 hover:border-white/20 hover:shadow-soft">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  profile?.is_phone_verified 
                    ? 'bg-green-500/20' 
                    : 'bg-yellow-500/20'
                }`}>
                  <Phone className={`h-5 w-5 ${
                    profile?.is_phone_verified 
                      ? 'text-green-500' 
                      : 'text-yellow-500'
                  }`} />
                </div>
                <div>
                  <p className="font-medium">التحقق من رقم الهاتف</p>
                  <p className="text-xs text-muted-foreground">حماية حسابك بالتحقق الثنائي</p>
                </div>
              </div>
              <Badge className={profile?.is_phone_verified 
                ? 'bg-green-500/20 text-green-500 border-green-500/30' 
                : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
              }>
                {profile?.is_phone_verified ? (
                  <><CheckCircle2 className="h-3 w-3 ml-1" /> مكتمل</>
                ) : (
                  <><AlertCircle className="h-3 w-3 ml-1" /> غير مكتمل</>
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-glass backdrop-blur-sm rounded-xl border border-white/10 transition-all duration-300 hover:border-white/20 hover:shadow-soft">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  profile?.is_identity_verified 
                    ? 'bg-green-500/20' 
                    : 'bg-yellow-500/20'
                }`}>
                  <User className={`h-5 w-5 ${
                    profile?.is_identity_verified 
                      ? 'text-green-500' 
                      : 'text-yellow-500'
                  }`} />
                </div>
                <div>
                  <p className="font-medium">التحقق من الهوية</p>
                  <p className="text-xs text-muted-foreground">توثيق هويتك الشخصية</p>
                </div>
              </div>
              <Badge className={profile?.is_identity_verified 
                ? 'bg-green-500/20 text-green-500 border-green-500/30' 
                : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
              }>
                {profile?.is_identity_verified ? (
                  <><CheckCircle2 className="h-3 w-3 ml-1" /> مكتمل</>
                ) : (
                  <><AlertCircle className="h-3 w-3 ml-1" /> غير مكتمل</>
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-glass backdrop-blur-sm rounded-xl border border-white/10 transition-all duration-300 hover:border-white/20 hover:shadow-soft">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  profile?.is_account_activated 
                    ? 'bg-green-500/20' 
                    : 'bg-red-500/20'
                }`}>
                  <Shield className={`h-5 w-5 ${
                    profile?.is_account_activated 
                      ? 'text-green-500' 
                      : 'text-red-500'
                  }`} />
                </div>
                <div>
                  <p className="font-medium">حالة تفعيل الحساب</p>
                  <p className="text-xs text-muted-foreground">الوصول الكامل للخدمات</p>
                </div>
              </div>
              <Badge className={profile?.is_account_activated 
                ? 'bg-green-500/20 text-green-500 border-green-500/30' 
                : 'bg-red-500/20 text-red-500 border-red-500/30'
              }>
                {profile?.is_account_activated ? (
                  <><CheckCircle2 className="h-3 w-3 ml-1" /> مفعل</>
                ) : (
                  <><AlertCircle className="h-3 w-3 ml-1" /> غير مفعل</>
                )}
              </Badge>
            </div>

            {!profile?.is_account_activated && (
              <Button 
                variant="outline" 
                className="w-full bg-gradient-gold hover:opacity-90 transition-all duration-300 hover:scale-105 border-0 text-white"
                onClick={() => navigate('/activate')}
              >
                <Shield className="h-4 w-4 ml-2" />
                تفعيل الحساب الآن
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-gradient-card border-white/10 shadow-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>الإشعارات والتنبيهات</CardTitle>
                <CardDescription>تخصيص تفضيلات الإشعارات</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-glass backdrop-blur-sm rounded-xl border border-white/10 transition-all duration-300 hover:border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <Label className="font-medium">إشعارات المعاملات</Label>
                  <p className="text-xs text-muted-foreground">
                    احصل على تنبيهات فورية عند إتمام المعاملات
                  </p>
                </div>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
                className="data-[state=checked]:bg-gradient-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Actions */}
        <Card className="bg-gradient-card border-white/10 shadow-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>الأمان والخصوصية</CardTitle>
                <CardDescription>إدارة إعدادات الأمان</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-between bg-gradient-glass backdrop-blur-sm border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-300 group"
              onClick={() => {
                toast({
                  title: "قريباً",
                  description: "هذه الميزة ستكون متاحة قريباً",
                });
              }}
            >
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                تغيير كلمة المرور
              </div>
              <ChevronLeft className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-between bg-gradient-glass backdrop-blur-sm border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-300 group"
              onClick={() => {
                toast({
                  title: "قريباً",
                  description: "هذه الميزة ستكون متاحة قريباً",
                });
              }}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                سياسة الخصوصية
              </div>
              <ChevronLeft className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-between bg-gradient-glass backdrop-blur-sm border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-300 group"
              onClick={() => {
                toast({
                  title: "قريباً",
                  description: "هذه الميزة ستكون متاحة قريباً",
                });
              }}
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                المساعدة والدعم
              </div>
              <ChevronLeft className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-red-500/5 border-red-500/20 shadow-card animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-red-500">منطقة الخطر</CardTitle>
                <CardDescription>إجراءات حساسة ونهائية</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full justify-between bg-red-500/10 border-red-500/30 hover:bg-red-500/20 text-red-500 hover:text-red-600 transition-all duration-300 group"
              onClick={() => {
                toast({
                  title: "قريباً",
                  description: "هذه الميزة ستكون متاحة قريباً",
                  variant: "destructive"
                });
              }}
            >
              <div className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                حذف الحساب نهائياً
              </div>
              <ChevronLeft className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
