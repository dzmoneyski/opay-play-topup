import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { AlertTriangle, Check, X, RefreshCw } from 'lucide-react';
import BackButton from '@/components/BackButton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface SuspiciousReferral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referral_id: string;
  suspicious_reason: string;
  duplicate_phone: string;
  duplicate_count: number;
  flagged_at: string;
  status: string;
  referrer_name: string;
  referrer_phone: string;
  referred_name: string;
  referred_phone: string;
}

export default function SuspiciousReferralsPage() {
  const [selectedReferral, setSelectedReferral] = useState<SuspiciousReferral | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [dialogAction, setDialogAction] = useState<'confirm' | 'dismiss' | null>(null);
  const queryClient = useQueryClient();

  // Fetch suspicious referrals
  const { data: suspiciousReferrals, isLoading } = useQuery({
    queryKey: ['suspicious-referrals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suspicious_referrals')
        .select(`
          *,
          referrer:referrer_id(full_name, phone),
          referred:referred_user_id(full_name, phone)
        `)
        .order('flagged_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        referrer_name: item.referrer?.full_name || 'غير معروف',
        referrer_phone: item.referrer?.phone || 'غير معروف',
        referred_name: item.referred?.full_name || 'غير معروف',
        referred_phone: item.referred?.phone || 'غير معروف',
      })) as SuspiciousReferral[];
    },
  });

  // Rescan for suspicious referrals
  const rescanMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('flag_suspicious_referrals');
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`تم الكشف عن ${data.flagged_count} إحالة مشبوهة`);
      queryClient.invalidateQueries({ queryKey: ['suspicious-referrals'] });
    },
    onError: (error: any) => {
      toast.error('فشل الفحص: ' + error.message);
    },
  });

  // Cancel fraudulent referral
  const cancelReferralMutation = useMutation({
    mutationFn: async ({ referralId, notes }: { referralId: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('غير مصرح');

      const { data, error } = await supabase.rpc('cancel_fraudulent_referral', {
        _referral_id: referralId,
        _admin_id: user.id,
        _admin_notes: notes,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('تم إلغاء الإحالة واسترجاع الأموال');
      queryClient.invalidateQueries({ queryKey: ['suspicious-referrals'] });
      setSelectedReferral(null);
      setDialogAction(null);
      setAdminNotes('');
    },
    onError: (error: any) => {
      toast.error('فشل الإلغاء: ' + error.message);
    },
  });

  // Mark as false positive
  const markFalsePositiveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('غير مصرح');

      const { error } = await supabase
        .from('suspicious_referrals')
        .update({
          status: 'false_positive',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: notes,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم تجاهل البلاغ');
      queryClient.invalidateQueries({ queryKey: ['suspicious-referrals'] });
      setSelectedReferral(null);
      setDialogAction(null);
      setAdminNotes('');
    },
    onError: (error: any) => {
      toast.error('فشل التحديث: ' + error.message);
    },
  });

  const handleConfirmAction = () => {
    if (!selectedReferral) return;

    if (dialogAction === 'confirm') {
      cancelReferralMutation.mutate({
        referralId: selectedReferral.referral_id,
        notes: adminNotes,
      });
    } else if (dialogAction === 'dismiss') {
      markFalsePositiveMutation.mutate({
        id: selectedReferral.id,
        notes: adminNotes,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10">قيد المراجعة</Badge>;
      case 'confirmed_fraud':
        return <Badge variant="destructive">تم تأكيد الاحتيال</Badge>;
      case 'false_positive':
        return <Badge variant="secondary">بلاغ خاطئ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = suspiciousReferrals?.filter(r => r.status === 'pending').length || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold">الإحالات المشبوهة</h1>
            <p className="text-muted-foreground">مراجعة وإدارة الإحالات المشكوك فيها</p>
          </div>
        </div>
        <Button
          onClick={() => rescanMutation.mutate()}
          disabled={rescanMutation.isPending}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 ml-2 ${rescanMutation.isPending ? 'animate-spin' : ''}`} />
          إعادة الفحص
        </Button>
      </div>

      {pendingCount > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              {pendingCount} إحالة مشبوهة تنتظر المراجعة
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">جاري التحميل...</CardContent>
        </Card>
      ) : suspiciousReferrals?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            لا توجد إحالات مشبوهة
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {suspiciousReferrals?.map((referral) => (
            <Card key={referral.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      المُحيل: {referral.referrer_name}
                    </CardTitle>
                    <CardDescription>
                      هاتف المُحيل: {referral.referrer_phone}
                    </CardDescription>
                  </div>
                  {getStatusBadge(referral.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">المُحال:</span> {referral.referred_name}
                  </div>
                  <div>
                    <span className="font-semibold">رقم الهاتف المكرر:</span> {referral.duplicate_phone}
                  </div>
                  <div>
                    <span className="font-semibold">عدد التكرارات:</span> {referral.duplicate_count}
                  </div>
                  <div>
                    <span className="font-semibold">تاريخ الكشف:</span>{' '}
                    {new Date(referral.flagged_at).toLocaleString('ar-DZ')}
                  </div>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-sm font-semibold text-red-600">
                    السبب: نفس رقم الهاتف تم استخدامه في {referral.duplicate_count} إحالات من نفس المُحيل
                  </p>
                </div>

                {referral.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => {
                        setSelectedReferral(referral);
                        setDialogAction('confirm');
                      }}
                      variant="destructive"
                      size="sm"
                    >
                      <X className="h-4 w-4 ml-2" />
                      إلغاء الإحالة واسترجاع الأموال
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedReferral(referral);
                        setDialogAction('dismiss');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Check className="h-4 w-4 ml-2" />
                      تجاهل (بلاغ خاطئ)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogAction !== null} onOpenChange={() => setDialogAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'confirm' ? 'تأكيد إلغاء الإحالة' : 'تجاهل البلاغ'}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === 'confirm'
                ? 'سيتم إلغاء الإحالة واسترجاع 100 دج من رصيد المكافآت. هذا الإجراء نهائي.'
                : 'سيتم تجاهل هذا البلاغ وعدم اعتباره احتيالاً.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">ملاحظات إدارية (اختياري)</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="أضف ملاحظاتك هنا..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)}>
              إلغاء
            </Button>
            <Button
              onClick={handleConfirmAction}
              variant={dialogAction === 'confirm' ? 'destructive' : 'default'}
              disabled={cancelReferralMutation.isPending || markFalsePositiveMutation.isPending}
            >
              {dialogAction === 'confirm' ? 'إلغاء الإحالة' : 'تجاهل'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
