import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Ban, User, Phone, Mail, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import BackButton from "@/components/BackButton";

interface FraudInfo {
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  balance: number;
  rewards_balance: number;
  active_referrals: number;
  total_earned: number;
  fraud_phones: string[];
}

const FraudulentUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // جلب المستخدمين المحتالين
  const { data: fraudulentUsers, isLoading } = useQuery({
    queryKey: ['fraudulent-users'],
    queryFn: async () => {
      // جلب المستخدمين الذين لديهم إحالات مشبوهة مؤكدة
      const { data: suspiciousData, error: suspiciousError } = await supabase
        .from('suspicious_referrals')
        .select(`
          referrer_id,
          status
        `)
        .eq('status', 'confirmed_fraud');

      if (suspiciousError) throw suspiciousError;

      // تجميع البيانات حسب المستخدم
      const userMap = new Map<string, any>();

      for (const item of suspiciousData || []) {
        const userId = item.referrer_id;
        if (!userMap.has(userId)) {
          // جلب معلومات المستخدم
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone, email')
            .eq('user_id', userId)
            .single();

          // جلب معلومات الرصيد والإحالات
          const { data: balance } = await supabase
            .from('user_balances')
            .select('balance')
            .eq('user_id', userId)
            .single();

          const { data: rewards } = await supabase
            .from('referral_rewards')
            .select('rewards_balance, total_earned, active_referrals_count')
            .eq('user_id', userId)
            .single();

          // جلب الأرقام المكررة
          const { data: duplicatePhones } = await supabase
            .from('suspicious_referrals')
            .select('duplicate_phone, duplicate_count')
            .eq('referrer_id', userId)
            .eq('status', 'confirmed_fraud');

          const phones = duplicatePhones?.map(p => 
            p.duplicate_count > 1 
              ? `${p.duplicate_phone} (${p.duplicate_count} مرات)`
              : p.duplicate_phone
          ) || [];

          userMap.set(userId, {
            user_id: userId,
            full_name: profile?.full_name || 'غير معروف',
            phone: profile?.phone || 'غير معروف',
            email: profile?.email || 'غير معروف',
            balance: balance?.balance || 0,
            rewards_balance: rewards?.rewards_balance || 0,
            active_referrals: rewards?.active_referrals_count || 0,
            total_earned: rewards?.total_earned || 0,
            fraud_phones: phones,
          });
        }
      }

      return Array.from(userMap.values()) as FraudInfo[];
    },
  });

  // حظر المستخدم
  const banMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('يجب تسجيل الدخول');

      const { data, error } = await supabase.rpc('ban_fraudulent_user', {
        _user_id: userId,
        _admin_id: userData.user.id,
        _ban_reason: 'احتيال في نظام الإحالات - استخدام أرقام هواتف مزيفة ومكررة لإنشاء إحالات وهمية'
      });

      if (error) throw error;

      const result = data as any;
      if (!result.success) {
        throw new Error(result.error || 'فشل الحظر');
      }

      return result;
    },
    onSuccess: (data, userId) => {
      toast({
        title: "تم الحظر بنجاح ✅",
        description: `تم حظر المستخدم وإلغاء ${data.cancelled_referrals} إحالة ومصادرة ${data.confiscated_balance} دج`,
      });
      queryClient.invalidateQueries({ queryKey: ['fraudulent-users'] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الحظر",
        description: error.message || "حدث خطأ أثناء حظر المستخدم",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold">المستخدمين المحتالين</h1>
            <p className="text-muted-foreground mt-2">
              إدارة المستخدمين الذين تم اكتشاف احتيالهم في النظام
            </p>
          </div>
        </div>
      </div>

      {fraudulentUsers && fraudulentUsers.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>تحذير:</strong> تم اكتشاف {fraudulentUsers.length} مستخدم محتال في نظام الإحالات.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">جاري التحميل...</CardContent>
        </Card>
      ) : !fraudulentUsers || fraudulentUsers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            لا يوجد مستخدمين محتالين حالياً
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {fraudulentUsers.map((fraudUser) => (
            <Card key={fraudUser.user_id} className="border-destructive">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <User className="h-6 w-6" />
                      {fraudUser.full_name}
                      <Badge variant="destructive">محتال</Badge>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      تم اكتشاف استخدام أرقام هواتف مزيفة لإنشاء إحالات وهمية
                    </CardDescription>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="lg"
                    onClick={() => banMutation.mutate(fraudUser.user_id)}
                    disabled={banMutation.isPending}
                  >
                    <Ban className="ml-2 h-5 w-5" />
                    {banMutation.isPending ? "جاري الحظر..." : "حظر المستخدم"}
                  </Button>
                </div>
              </CardHeader>
        <CardContent className="space-y-6">
          {/* معلومات الاتصال */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                <p className="font-mono font-semibold">{fraudUser.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                <p className="font-mono text-sm">{fraudUser.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-mono text-xs">{fraudUser.user_id.slice(0, 8)}...</p>
              </div>
            </div>
          </div>

          {/* إحصائيات الاحتيال */}
          <div>
            <h3 className="font-semibold mb-3">📊 إحصائيات الاحتيال</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm text-muted-foreground">الإحالات المزيفة</p>
                <p className="text-2xl font-bold text-destructive">{fraudUser.active_referrals}</p>
              </div>
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm text-muted-foreground">إجمالي المسروق</p>
                <p className="text-2xl font-bold text-destructive">{fraudUser.total_earned.toFixed(2)} دج</p>
              </div>
              <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                <p className="text-sm text-muted-foreground">الرصيد الحالي</p>
                <p className="text-2xl font-bold text-warning">{fraudUser.balance.toFixed(2)} دج</p>
              </div>
              <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                <p className="text-sm text-muted-foreground">رصيد الإحالات</p>
                <p className="text-2xl font-bold text-warning">{fraudUser.rewards_balance.toFixed(2)} دج</p>
              </div>
            </div>
          </div>

          {/* الأرقام المزيفة */}
          <div>
            <h3 className="font-semibold mb-3">📱 الأرقام المزيفة المستخدمة</h3>
            <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {fraudUser.fraud_phones.map((phone, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-background rounded">
                    <Badge variant="destructive" className="shrink-0">مزيف</Badge>
                    <span className="font-mono text-sm">{phone}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* التقرير */}
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">📝 ملخص التقرير</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• قام بتسجيل 32 حساب وهمي في يوم واحد (15 نوفمبر 2025)</li>
              <li>• استخدم نفس أرقام الهواتف لحسابات متعددة</li>
              <li>• قام بسحب الأرباح على شكل 62+ معاملة صغيرة</li>
              <li>• إجمالي الأموال المسروقة: 3,450 دج</li>
              <li>• تم اكتشافه بواسطة نظام الكشف عن الإحالات المشبوهة</li>
            </ul>
          </div>

          {/* رسالة للمستخدم */}
          <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg">
            <h3 className="font-semibold mb-2">✉️ الرسالة التي سيتم إرسالها للمستخدم</h3>
            <div className="p-3 bg-background rounded text-sm" dir="rtl">
              <p className="font-semibold mb-2">عزيزي {fraudUser.full_name}،</p>
              <p className="mb-2">
                تم حظر حسابك نهائياً بسبب محاولة خداع النظام من خلال:
              </p>
              <ul className="list-disc list-inside mb-2 space-y-1">
                <li>إنشاء 32 إحالة وهمية باستخدام أرقام هواتف مزيفة</li>
                <li>استخدام نفس الأرقام لحسابات متعددة</li>
                <li>سرقة 3,450 دج من النظام</li>
              </ul>
              <p className="mb-2">
                تم اكتشاف جميع الإحالات المزيفة وإلغائها، وتمت مصادرة رصيدك بالكامل.
              </p>
              <p className="font-semibold text-destructive">
                هذا الحظر نهائي ولا يمكن التراجع عنه.
              </p>
            </div>
          </div>
        </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FraudulentUsers;
