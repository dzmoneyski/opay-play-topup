import { useState, useEffect } from 'react';
import { Smartphone, Loader2, CheckCircle, XCircle, Clock, Phone, Search, Filter, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Import operator logos
import mobilisLogo from '@/assets/mobilis-logo.png';
import djezzyLogo from '@/assets/djezzy-logo.png';
import ooredooLogo from '@/assets/ooredoo-logo.png';
import idoomLogo from '@/assets/idoom-logo.webp';

interface PhoneOrder {
  id: string;
  user_id: string;
  phone_number: string;
  amount: number;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  processed_at: string | null;
  processed_by: string | null;
  created_at: string;
  phone_operators: {
    name: string;
    name_ar: string;
    slug: string;
  } | null;
  profiles: {
    full_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
}

const operatorLogos: Record<string, string> = {
  'mobilis': mobilisLogo,
  'djezzy': djezzyLogo,
  'ooredoo': ooredooLogo,
  'idoom-adsl': idoomLogo
};

const operatorColors: Record<string, string> = {
  'mobilis': 'from-green-500 to-green-600',
  'djezzy': 'from-red-500 to-red-600',
  'ooredoo': 'from-purple-500 to-purple-600',
  'idoom-adsl': 'from-blue-500 to-blue-600'
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  'pending': { label: 'معلق', color: 'bg-yellow-500', icon: Clock },
  'approved': { label: 'تمت الموافقة', color: 'bg-green-500', icon: CheckCircle },
  'rejected': { label: 'مرفوض', color: 'bg-red-500', icon: XCircle }
};

const AdminPhoneTopup = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<PhoneOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PhoneOrder | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchOrders();
    fetchStats();

    // Real-time subscription
    const channel = supabase
      .channel('admin-phone-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phone_topup_orders' }, () => {
        fetchOrders();
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, page]);

  const fetchStats = async () => {
    try {
      const { data: pending } = await supabase
        .from('phone_topup_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { data: approved } = await supabase
        .from('phone_topup_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved');

      const { data: rejected } = await supabase
        .from('phone_topup_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'rejected');

      const { count: total } = await supabase
        .from('phone_topup_orders')
        .select('id', { count: 'exact', head: true });

      setStats({
        pending: (pending as any)?.length || 0,
        approved: (approved as any)?.length || 0,
        rejected: (rejected as any)?.length || 0,
        total: total || 0
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('phone_topup_orders')
        .select(`
          *,
          phone_operators(name, name_ar, slug)
        `, { count: 'exact' });

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set((data || []).map(o => o.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, email')
        .in('user_id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const ordersWithProfiles = (data || []).map(order => ({
        ...order,
        profiles: profilesMap.get(order.user_id) || null
      }));
      setOrders(ordersWithProfiles as PhoneOrder[]);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في جلب الطلبات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedOrder || !actionType) return;
    
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc(
        actionType === 'approve' ? 'approve_phone_topup_order' : 'reject_phone_topup_order',
        {
          _order_id: selectedOrder.id,
          _admin_notes: adminNotes || null
        }
      );

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };
      
      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: 'نجاح',
        description: result.message
      });

      setSelectedOrder(null);
      setActionType(null);
      setAdminNotes('');
      fetchOrders();
      fetchStats();
    } catch (err: any) {
      toast({
        title: 'خطأ',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order.phone_number.includes(search) ||
      order.profiles?.full_name?.toLowerCase().includes(search) ||
      order.profiles?.phone?.includes(search) ||
      order.phone_operators?.name_ar?.includes(search)
    );
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-primary" />
            إدارة طلبات شحن الهاتف
          </h1>
          <p className="text-muted-foreground">مراجعة ومعالجة طلبات شحن الهاتف</p>
        </div>
        <Button variant="outline" onClick={() => { fetchOrders(); fetchStats(); }}>
          <RefreshCw className="w-4 h-4 ml-2" />
          تحديث
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">معلقة</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">مقبولة</p>
                <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">مرفوضة</p>
                <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">الإجمالي</p>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
              </div>
              <Smartphone className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الهاتف، اسم المستخدم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            معلقة ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            مقبولة
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="w-4 h-4" />
            مرفوضة
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            الكل
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Smartphone className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">لا توجد طلبات</h3>
                <p className="text-muted-foreground">
                  {activeTab === 'pending' ? 'لا توجد طلبات معلقة حالياً' : 'لا توجد طلبات في هذا القسم'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const StatusIcon = statusConfig[order.status]?.icon || Clock;
                return (
                  <Card key={order.id} className="overflow-hidden">
                    <div className={`h-1 bg-gradient-to-r ${operatorColors[order.phone_operators?.slug || ''] || 'from-gray-500 to-gray-600'}`} />
                    <CardContent className="py-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Operator & User Info */}
                        <div className="flex items-center gap-3">
                          {operatorLogos[order.phone_operators?.slug || ''] ? (
                            <img 
                              src={operatorLogos[order.phone_operators?.slug || '']} 
                              alt={order.phone_operators?.name_ar}
                              className="w-12 h-12 rounded-xl object-contain bg-white p-1"
                            />
                          ) : (
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${operatorColors[order.phone_operators?.slug || ''] || 'from-gray-500 to-gray-600'} flex items-center justify-center`}>
                              <Smartphone className="w-6 h-6 text-white" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold">{order.phone_operators?.name_ar || 'غير محدد'}</h3>
                            <p className="text-sm text-muted-foreground">
                              {order.profiles?.full_name || 'مستخدم'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.profiles?.phone || order.profiles?.email}
                            </p>
                          </div>
                        </div>

                        {/* Phone Number */}
                        <div className="bg-muted/50 rounded-lg p-3 flex-1 max-w-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">رقم الشحن</span>
                          </div>
                          <p className="font-mono text-lg font-bold" dir="ltr">{order.phone_number}</p>
                        </div>

                        {/* Amount & Status */}
                        <div className="text-left">
                          <p className="font-bold text-xl text-primary">{order.amount.toLocaleString()} د.ج</p>
                          <Badge className={`${statusConfig[order.status]?.color} text-white mt-1`}>
                            <StatusIcon className="w-3 h-3 ml-1" />
                            {statusConfig[order.status]?.label}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(order.created_at).toLocaleString('ar-DZ')}
                          </p>
                        </div>

                        {/* Actions */}
                        {order.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              className="bg-green-500 hover:bg-green-600"
                              onClick={() => {
                                setSelectedOrder(order);
                                setActionType('approve');
                              }}
                            >
                              <CheckCircle className="w-4 h-4 ml-1" />
                              قبول
                            </Button>
                            <Button 
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedOrder(order);
                                setActionType('reject');
                              }}
                            >
                              <XCircle className="w-4 h-4 ml-1" />
                              رفض
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {(order.notes || order.admin_notes) && (
                        <div className="mt-3 pt-3 border-t">
                          {order.notes && (
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">ملاحظات المستخدم:</span> {order.notes}
                            </p>
                          )}
                          {order.admin_notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">ملاحظات الإدارة:</span> {order.admin_notes}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    السابق
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    صفحة {page} من {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    التالي
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={!!selectedOrder && !!actionType} onOpenChange={() => {
        setSelectedOrder(null);
        setActionType(null);
        setAdminNotes('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'تأكيد الشحن' : 'رفض الطلب'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  {operatorLogos[selectedOrder.phone_operators?.slug || ''] ? (
                    <img 
                      src={operatorLogos[selectedOrder.phone_operators?.slug || '']} 
                      alt={selectedOrder.phone_operators?.name_ar}
                      className="w-10 h-10 rounded-lg object-contain bg-white p-1"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${operatorColors[selectedOrder.phone_operators?.slug || '']} flex items-center justify-center`}>
                      <Smartphone className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold">{selectedOrder.phone_operators?.name_ar}</p>
                    <p className="text-sm text-muted-foreground">{selectedOrder.profiles?.full_name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                    <p className="font-mono font-bold" dir="ltr">{selectedOrder.phone_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">المبلغ</p>
                    <p className="font-bold text-primary">{selectedOrder.amount.toLocaleString()} د.ج</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">
                  {actionType === 'reject' ? 'سبب الرفض' : 'ملاحظات'} (اختياري)
                </label>
                <Textarea
                  placeholder={actionType === 'reject' ? 'سبب الرفض...' : 'أي ملاحظات...'}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setSelectedOrder(null);
              setActionType(null);
              setAdminNotes('');
            }}>
              إلغاء
            </Button>
            <Button 
              onClick={handleAction}
              disabled={processing}
              className={actionType === 'approve' ? 'bg-green-500 hover:bg-green-600' : ''}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : actionType === 'approve' ? (
                'تأكيد الشحن'
              ) : (
                'رفض الطلب'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPhoneTopup;
