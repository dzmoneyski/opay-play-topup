import { useState, useEffect } from 'react';
import { Smartphone, Loader2, CheckCircle, XCircle, Clock, Phone, Search, RefreshCw, Settings, Power, PowerOff, Save, Percent, DollarSign, Calculator } from 'lucide-react';
import AgentAccountingReport from '@/components/admin/AgentAccountingReport';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Import operator logos
import mobilisLogo from '@/assets/mobilis-logo.png';
import djezzyLogo from '@/assets/djezzy-logo.png';
import ooredooLogo from '@/assets/ooredoo-logo.png';
import idoomLogo from '@/assets/idoom-logo.webp';
import lte4gLogo from '@/assets/4g-lte-logo.webp';

interface PhoneOrder {
  id: string;
  user_id: string;
  phone_number: string;
  amount: number;
  fee_amount: number;
  total_amount: number;
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

interface PhoneOperator {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  min_amount: number;
  max_amount: number;
  fee_type: 'percentage' | 'fixed';
  fee_value: number;
  fee_min: number;
  fee_max: number | null;
  display_order: number;
}

interface PhoneTopupSettings {
  enabled: boolean;
  global_fee_type: 'percentage' | 'fixed';
  global_fee_value: number;
  global_fee_min: number;
  global_fee_max: number | null;
  use_operator_fees: boolean;
}

const operatorLogos: Record<string, string> = {
  'mobilis': mobilisLogo,
  'djezzy': djezzyLogo,
  'ooredoo': ooredooLogo,
  'idoom-adsl': idoomLogo,
  '4g-adsl': lte4gLogo
};

const operatorColors: Record<string, string> = {
  'mobilis': 'from-green-500 to-green-600',
  'djezzy': 'from-red-500 to-red-600',
  'ooredoo': 'from-purple-500 to-purple-600',
  'idoom-adsl': 'from-blue-500 to-blue-600',
  '4g-adsl': 'from-cyan-500 to-cyan-600'
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  'pending': { label: 'معلق', color: 'bg-yellow-500', icon: Clock },
  'approved': { label: 'تمت الموافقة', color: 'bg-green-500', icon: CheckCircle },
  'rejected': { label: 'مرفوض', color: 'bg-red-500', icon: XCircle }
};

const AdminPhoneTopup = () => {
  const { toast } = useToast();
  
  // Orders state
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

  // Settings state
  const [mainTab, setMainTab] = useState('orders');
  const [operators, setOperators] = useState<PhoneOperator[]>([]);
  const [settings, setSettings] = useState<PhoneTopupSettings>({
    enabled: true,
    global_fee_type: 'percentage',
    global_fee_value: 0,
    global_fee_min: 0,
    global_fee_max: null,
    use_operator_fees: true
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingOperator, setSavingOperator] = useState<string | null>(null);

  useEffect(() => {
    if (mainTab === 'orders') {
      fetchOrders();
      fetchStats();
    } else {
      fetchOperators();
      fetchSettings();
    }

    // Real-time subscription for orders
    const channel = supabase
      .channel('admin-phone-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phone_topup_orders' }, () => {
        if (mainTab === 'orders') {
          fetchOrders();
          fetchStats();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, page, mainTab]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'phone_topup_settings')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings(data.setting_value as unknown as PhoneTopupSettings);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const fetchOperators = async () => {
    try {
      const { data, error } = await supabase
        .from('phone_operators')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setOperators(data as PhoneOperator[]);
    } catch (err) {
      console.error('Error fetching operators:', err);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          setting_value: JSON.parse(JSON.stringify(settings))
        })
        .eq('setting_key', 'phone_topup_settings');

      if (error) throw error;

      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ الإعدادات العامة بنجاح'
      });
    } catch (err: any) {
      toast({
        title: 'خطأ',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const updateOperator = async (operator: PhoneOperator) => {
    setSavingOperator(operator.id);
    try {
      const { error } = await supabase
        .from('phone_operators')
        .update({
          is_active: operator.is_active,
          min_amount: operator.min_amount,
          max_amount: operator.max_amount,
          fee_type: operator.fee_type,
          fee_value: operator.fee_value,
          fee_min: operator.fee_min,
          fee_max: operator.fee_max
        })
        .eq('id', operator.id);

      if (error) throw error;

      toast({
        title: 'تم الحفظ',
        description: `تم تحديث إعدادات ${operator.name_ar} بنجاح`
      });
    } catch (err: any) {
      toast({
        title: 'خطأ',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setSavingOperator(null);
    }
  };

  const handleOperatorChange = (id: string, field: keyof PhoneOperator, value: any) => {
    setOperators(prev => prev.map(op => 
      op.id === id ? { ...op, [field]: value } : op
    ));
  };

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

  const calculateFeePreview = (amount: number, feeType: string, feeValue: number, feeMin: number, feeMax: number | null) => {
    let fee = 0;
    if (feeType === 'percentage') {
      fee = (amount * feeValue) / 100;
    } else {
      fee = feeValue;
    }
    
    fee = Math.max(fee, feeMin);
    if (feeMax !== null) {
      fee = Math.min(fee, feeMax);
    }
    
    return fee;
  };

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-primary" />
            إدارة شحن الهاتف
          </h1>
          <p className="text-muted-foreground">إدارة الطلبات والإعدادات</p>
        </div>
        <Button variant="outline" onClick={() => { 
          if (mainTab === 'orders') {
            fetchOrders(); 
            fetchStats(); 
          } else {
            fetchOperators();
            fetchSettings();
          }
        }}>
          <RefreshCw className="w-4 h-4 ml-2" />
          تحديث
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="orders" className="gap-2">
            <Phone className="w-4 h-4" />
            الطلبات
          </TabsTrigger>
          <TabsTrigger value="accounting" className="gap-2">
            <Calculator className="w-4 h-4" />
            محاسبة الوكلاء
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            الإعدادات
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <Card>
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

          {/* Status Tabs */}
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
                              {order.fee_amount > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  رسوم: {order.fee_amount.toLocaleString()} د.ج
                                </p>
                              )}
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
        </TabsContent>

        {/* Accounting Tab */}
        <TabsContent value="accounting" className="space-y-6">
          <AgentAccountingReport />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          {/* Global Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                الإعدادات العامة
              </CardTitle>
              <CardDescription>
                التحكم في خدمة شحن الهاتف بشكل عام
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Service Toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {settings.enabled ? (
                    <Power className="w-6 h-6 text-green-500" />
                  ) : (
                    <PowerOff className="w-6 h-6 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">حالة الخدمة</p>
                    <p className="text-sm text-muted-foreground">
                      {settings.enabled ? 'الخدمة مفعلة ومتاحة للمستخدمين' : 'الخدمة متوقفة مؤقتاً'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
                />
              </div>

              {/* Use Operator Fees */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">استخدام رسوم المشغلين</p>
                  <p className="text-sm text-muted-foreground">
                    عند التفعيل: يتم استخدام رسوم كل مشغل على حدة. عند الإلغاء: يتم استخدام الرسوم العامة
                  </p>
                </div>
                <Switch
                  checked={settings.use_operator_fees}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, use_operator_fees: checked }))}
                />
              </div>

              {/* Global Fee Settings (shown when use_operator_fees is false) */}
              {!settings.use_operator_fees && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    الرسوم العامة
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>نوع الرسوم</Label>
                      <Select
                        value={settings.global_fee_type}
                        onValueChange={(value: 'percentage' | 'fixed') => 
                          setSettings(prev => ({ ...prev, global_fee_type: value }))
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                          <SelectItem value="fixed">مبلغ ثابت (د.ج)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>
                        {settings.global_fee_type === 'percentage' ? 'النسبة (%)' : 'المبلغ (د.ج)'}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step={settings.global_fee_type === 'percentage' ? '0.1' : '1'}
                        value={settings.global_fee_value}
                        onChange={(e) => setSettings(prev => ({ ...prev, global_fee_value: parseFloat(e.target.value) || 0 }))}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>الحد الأدنى للرسوم (د.ج)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={settings.global_fee_min}
                        onChange={(e) => setSettings(prev => ({ ...prev, global_fee_min: parseFloat(e.target.value) || 0 }))}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>الحد الأقصى للرسوم (د.ج) - اتركه فارغاً بدون حد</Label>
                      <Input
                        type="number"
                        min="0"
                        value={settings.global_fee_max ?? ''}
                        onChange={(e) => setSettings(prev => ({ 
                          ...prev, 
                          global_fee_max: e.target.value ? parseFloat(e.target.value) : null 
                        }))}
                        className="mt-1"
                        placeholder="بدون حد"
                      />
                    </div>
                  </div>

                  {/* Fee Preview */}
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <p className="text-sm font-medium mb-2">معاينة الرسوم:</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {[1000, 5000, 10000].map(amount => {
                        const fee = calculateFeePreview(
                          amount, 
                          settings.global_fee_type, 
                          settings.global_fee_value, 
                          settings.global_fee_min, 
                          settings.global_fee_max
                        );
                        return (
                          <div key={amount} className="text-center">
                            <p className="text-muted-foreground">{amount.toLocaleString()} د.ج</p>
                            <p className="font-bold text-primary">{fee.toLocaleString()} د.ج</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={saveSettings} disabled={savingSettings} className="w-full">
                {savingSettings ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Save className="w-4 h-4 ml-2" />
                )}
                حفظ الإعدادات العامة
              </Button>
            </CardContent>
          </Card>

          {/* Operators Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                إعدادات المشغلين
              </CardTitle>
              <CardDescription>
                التحكم في كل مشغل على حدة: التفعيل، الحدود، والرسوم
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {operators.map((operator) => (
                <div 
                  key={operator.id} 
                  className={`border rounded-lg overflow-hidden transition-opacity ${!operator.is_active ? 'opacity-60' : ''}`}
                >
                  {/* Operator Header */}
                  <div className={`h-1 bg-gradient-to-r ${operatorColors[operator.slug] || 'from-gray-500 to-gray-600'}`} />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {operatorLogos[operator.slug] ? (
                          <img 
                            src={operatorLogos[operator.slug]} 
                            alt={operator.name_ar}
                            className="w-12 h-12 rounded-xl object-contain bg-white p-1 border"
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${operatorColors[operator.slug] || 'from-gray-500 to-gray-600'} flex items-center justify-center`}>
                            <Smartphone className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-lg">{operator.name_ar}</h3>
                          <p className="text-sm text-muted-foreground">{operator.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={operator.is_active ? 'default' : 'secondary'}>
                          {operator.is_active ? 'مفعل' : 'معطل'}
                        </Badge>
                        <Switch
                          checked={operator.is_active}
                          onCheckedChange={(checked) => handleOperatorChange(operator.id, 'is_active', checked)}
                        />
                      </div>
                    </div>

                    {/* Operator Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <Label className="text-xs">الحد الأدنى (د.ج)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={operator.min_amount}
                          onChange={(e) => handleOperatorChange(operator.id, 'min_amount', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">الحد الأقصى (د.ج)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={operator.max_amount}
                          onChange={(e) => handleOperatorChange(operator.id, 'max_amount', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">نوع الرسوم</Label>
                        <Select
                          value={operator.fee_type}
                          onValueChange={(value: 'percentage' | 'fixed') => 
                            handleOperatorChange(operator.id, 'fee_type', value)
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">نسبة (%)</SelectItem>
                            <SelectItem value="fixed">ثابت (د.ج)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">
                          {operator.fee_type === 'percentage' ? 'النسبة (%)' : 'المبلغ (د.ج)'}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step={operator.fee_type === 'percentage' ? '0.1' : '1'}
                          value={operator.fee_value}
                          onChange={(e) => handleOperatorChange(operator.id, 'fee_value', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label className="text-xs">الحد الأدنى للرسوم (د.ج)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={operator.fee_min}
                          onChange={(e) => handleOperatorChange(operator.id, 'fee_min', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">الحد الأقصى للرسوم (د.ج)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={operator.fee_max ?? ''}
                          onChange={(e) => handleOperatorChange(
                            operator.id, 
                            'fee_max', 
                            e.target.value ? parseFloat(e.target.value) : null
                          )}
                          className="mt-1"
                          placeholder="بدون حد"
                        />
                      </div>
                    </div>

                    {/* Fee Preview for this operator */}
                    {settings.use_operator_fees && operator.fee_value > 0 && (
                      <div className="bg-muted/50 p-3 rounded-lg mb-4">
                        <p className="text-xs font-medium mb-2">معاينة الرسوم:</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {[operator.min_amount, Math.round((operator.min_amount + operator.max_amount) / 2), operator.max_amount].map(amount => {
                            const fee = calculateFeePreview(
                              amount, 
                              operator.fee_type, 
                              operator.fee_value, 
                              operator.fee_min, 
                              operator.fee_max
                            );
                            return (
                              <div key={amount} className="text-center">
                                <p className="text-muted-foreground">{amount.toLocaleString()} د.ج</p>
                                <p className="font-bold text-primary">{fee.toLocaleString()} د.ج</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <Button 
                      onClick={() => updateOperator(operator)} 
                      disabled={savingOperator === operator.id}
                      size="sm"
                      className="w-full"
                    >
                      {savingOperator === operator.id ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      ) : (
                        <Save className="w-4 h-4 ml-2" />
                      )}
                      حفظ إعدادات {operator.name_ar}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
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
