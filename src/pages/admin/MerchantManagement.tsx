import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, XCircle, Store, TrendingUp, Users, RefreshCw } from 'lucide-react';

const MerchantManagement = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [commissionRate, setCommissionRate] = useState('2.00');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch merchant requests and merchants
      const [requestsRes, merchantsRes] = await Promise.all([
        supabase
          .from('merchant_requests')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('merchants')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (requestsRes.error) throw requestsRes.error;
      if (merchantsRes.error) throw merchantsRes.error;

      // Get unique user IDs
      const allUserIds = new Set([
        ...(requestsRes.data || []).map(r => r.user_id),
        ...(merchantsRes.data || []).map(m => m.user_id)
      ]);

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', Array.from(allUserIds));

      if (profilesError) throw profilesError;

      // Create a map of user_id to profile
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

      // Merge profiles with requests and merchants
      const requestsWithProfiles = (requestsRes.data || []).map(r => ({
        ...r,
        profiles: profilesMap.get(r.user_id)
      }));

      const merchantsWithProfiles = (merchantsRes.data || []).map(m => ({
        ...m,
        profiles: profilesMap.get(m.user_id)
      }));

      setRequests(requestsWithProfiles);
      setMerchants(merchantsWithProfiles);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      const { data, error } = await supabase.rpc('approve_merchant_request', {
        _request_id: requestId,
        _admin_id: user?.id,
        _commission_rate: parseFloat(commissionRate)
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; merchant_code?: string };

      if (!result.success) {
        toast.error(result.error || 'فشلت الموافقة');
        return;
      }

      toast.success(`تمت الموافقة! كود التاجر: ${result.merchant_code}`);
      fetchData();
      setCommissionRate('2.00');
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('يجب إدخال سبب الرفض');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('reject_merchant_request', {
        _request_id: requestId,
        _admin_id: user?.id,
        _reason: rejectionReason
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };

      if (!result.success) {
        toast.error(result.error || 'فشل الرفض');
        return;
      }

      toast.success('تم رفض الطلب');
      fetchData();
      setRejectionReason('');
      setSelectedRequest(null);
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const totalBalance = merchants.reduce((sum, m) => sum + parseFloat(m.balance || 0), 0);
  const totalEarnings = merchants.reduce((sum, m) => sum + parseFloat(m.total_earnings || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">إدارة التجار</h1>
        <Button onClick={fetchData} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <Users className="h-8 w-8 text-primary mb-2" />
            <p className="text-sm text-muted-foreground">إجمالي التجار</p>
            <p className="text-2xl font-bold">{merchants.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Store className="h-8 w-8 text-blue-600 mb-2" />
            <p className="text-sm text-muted-foreground">رصيد التجار</p>
            <p className="text-2xl font-bold">{totalBalance.toFixed(2)} دج</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
            <p className="text-sm text-muted-foreground">إجمالي الأرباح</p>
            <p className="text-2xl font-bold text-green-600">{totalEarnings.toFixed(2)} دج</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="requests">
            الطلبات الجديدة
            {pendingRequests.length > 0 && (
              <Badge className="mr-2" variant="destructive">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="merchants">التجار المعتمدين</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          {loading ? (
            <p className="text-center py-8">جاري التحميل...</p>
          ) : pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                لا توجد طلبات جديدة
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{request.business_name}</CardTitle>
                        <CardDescription>
                          {request.profiles?.full_name || 'غير محدد'}
                        </CardDescription>
                      </div>
                      <Badge className={statusColors[request.status as keyof typeof statusColors]}>
                        {request.status === 'pending' ? 'قيد المراجعة' : request.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">نوع النشاط</p>
                        <p className="font-medium">{request.business_type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                        <p className="font-medium">{request.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">العنوان</p>
                        <p className="font-medium">{request.address}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">رقم البطاقة</p>
                        <p className="font-medium">{request.national_id}</p>
                      </div>
                    </div>
                    
                    {request.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">ملاحظات</p>
                        <p className="text-sm">{request.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-sm text-muted-foreground">نسبة العمولة (%)</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="10"
                          value={commissionRate}
                          onChange={(e) => setCommissionRate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <Button
                          onClick={() => handleApprove(request.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="ml-2 h-4 w-4" />
                          موافقة
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <XCircle className="ml-2 h-4 w-4" />
                              رفض
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>رفض الطلب</AlertDialogTitle>
                              <AlertDialogDescription>
                                الرجاء إدخال سبب الرفض
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="سبب الرفض..."
                              rows={3}
                            />
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => {
                                setRejectionReason('');
                                setSelectedRequest(null);
                              }}>
                                إلغاء
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleReject(request.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                تأكيد الرفض
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="merchants">
          {loading ? (
            <p className="text-center py-8">جاري التحميل...</p>
          ) : merchants.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                لا يوجد تجار معتمدين بعد
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {merchants.map((merchant) => (
                <Card key={merchant.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{merchant.business_name}</CardTitle>
                        <CardDescription>
                          {merchant.profiles?.full_name || 'غير محدد'} • {merchant.merchant_code}
                        </CardDescription>
                      </div>
                      <Badge variant={merchant.is_active ? 'default' : 'secondary'}>
                        {merchant.is_active ? 'نشط' : 'معطل'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">الرصيد</p>
                        <p className="text-lg font-bold">{parseFloat(merchant.balance).toFixed(2)} دج</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">إجمالي الأرباح</p>
                        <p className="text-lg font-bold text-green-600">
                          {parseFloat(merchant.total_earnings).toFixed(2)} دج
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">نسبة العمولة</p>
                        <p className="text-lg font-bold">{merchant.commission_rate}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">المستوى</p>
                        <p className="text-lg font-bold capitalize">{merchant.merchant_tier}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MerchantManagement;
