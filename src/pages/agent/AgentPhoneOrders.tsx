import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Loader2, CheckCircle, XCircle, Clock, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import BackButton from '@/components/BackButton';
import { useAgentPermissions } from '@/hooks/useAgentPermissions';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PhoneOrder {
  id: string;
  user_id: string;
  phone_number: string;
  amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  phone_operators: {
    name: string;
    name_ar: string;
    slug: string;
  };
  profiles: {
    full_name: string | null;
    phone: string | null;
  };
}

const operatorColors: Record<string, string> = {
  'mobilis': 'from-green-500 to-green-600',
  'djezzy': 'from-red-500 to-red-600',
  'ooredoo': 'from-purple-500 to-purple-600',
  'idoom-adsl': 'from-blue-500 to-blue-600'
};

const AgentPhoneOrders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAgent, loading: permLoading, canManagePhoneTopups } = useAgentPermissions();
  
  const [orders, setOrders] = useState<PhoneOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PhoneOrder | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!permLoading && (!isAgent || !canManagePhoneTopups)) {
      navigate('/agent');
    }
  }, [permLoading, isAgent, canManagePhoneTopups, navigate]);

  useEffect(() => {
    if (canManagePhoneTopups) {
      fetchOrders();
    }
  }, [canManagePhoneTopups]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('phone_topup_orders')
        .select(`*, phone_operators(name, name_ar, slug)`)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setOrders((data || []) as any);
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

  if (permLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <BackButton />
        
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-full mb-4">
            <Smartphone className="w-5 h-5 text-blue-500" />
            <span className="text-blue-500 font-medium">طلبات شحن الهاتف</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">إدارة طلبات شحن الهاتف</h1>
          <p className="text-muted-foreground">قم بمعالجة طلبات الشحن المعلقة</p>
        </div>

        {/* Stats */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">طلبات معلقة</span>
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {orders.length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {orders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">لا توجد طلبات معلقة</h3>
              <p className="text-muted-foreground">تم معالجة جميع الطلبات</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${operatorColors[order.phone_operators?.slug] || 'from-gray-500 to-gray-600'}`} />
                <CardContent className="py-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${operatorColors[order.phone_operators?.slug] || 'from-gray-500 to-gray-600'} flex items-center justify-center`}>
                        <Smartphone className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold">{order.phone_operators?.name_ar}</h3>
                        <p className="text-sm text-muted-foreground">
                          {order.profiles?.full_name || 'مستخدم'}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-lg text-primary">{order.amount.toLocaleString()} د.ج</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleString('ar-DZ')}
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">رقم الشحن:</span>
                    </div>
                    <p className="font-mono text-lg font-bold" dir="ltr">{order.phone_number}</p>
                    {order.notes && (
                      <p className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                        ملاحظات: {order.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 bg-green-500 hover:bg-green-600"
                      onClick={() => {
                        setSelectedOrder(order);
                        setActionType('approve');
                      }}
                    >
                      <CheckCircle className="w-4 h-4 ml-2" />
                      تم الشحن
                    </Button>
                    <Button 
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        setSelectedOrder(order);
                        setActionType('reject');
                      }}
                    >
                      <XCircle className="w-4 h-4 ml-2" />
                      رفض
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

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
                  <p className="text-sm text-muted-foreground mb-1">الشركة</p>
                  <p className="font-bold">{selectedOrder.phone_operators?.name_ar}</p>
                  <p className="text-sm text-muted-foreground mt-2 mb-1">رقم الهاتف</p>
                  <p className="font-mono font-bold" dir="ltr">{selectedOrder.phone_number}</p>
                  <p className="text-sm text-muted-foreground mt-2 mb-1">المبلغ</p>
                  <p className="font-bold text-primary">{selectedOrder.amount.toLocaleString()} د.ج</p>
                </div>

                <div>
                  <label className="text-sm font-medium">ملاحظات (اختياري)</label>
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
    </div>
  );
};

export default AgentPhoneOrders;
