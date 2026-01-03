import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Loader2, Check, X, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAgentPermissions } from '@/hooks/useAgentPermissions';
import { useAdminGameTopupOrders, useApproveGameTopupOrder, useRejectGameTopupOrder } from '@/hooks/useGamePlatforms';
import BackButton from '@/components/BackButton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

const AgentGameOrders = () => {
  const navigate = useNavigate();
  const { isAgent, canManageGameTopups, loading: permLoading } = useAgentPermissions();
  const { data: orders, isLoading, refetch } = useAdminGameTopupOrders();
  const approveOrder = useApproveGameTopupOrder();
  const rejectOrder = useRejectGameTopupOrder();

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!permLoading && (!isAgent || !canManageGameTopups)) {
      navigate('/agent');
    }
  }, [permLoading, isAgent, canManageGameTopups, navigate]);

  // Real-time subscription for new orders
  useEffect(() => {
    if (canManageGameTopups) {
      const channel = supabase
        .channel('agent-game-orders')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'game_topup_orders'
          },
          () => {
            toast.info('🎮 طلب جديد - تم استلام طلب شحن ألعاب جديد');
            refetch();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [canManageGameTopups, refetch]);

  const pendingOrders = orders?.filter(o => o.status === 'pending') || [];

  const handleAction = async () => {
    if (!selectedOrder || !actionType) return;

    setProcessing(true);
    try {
      if (actionType === 'approve') {
        await approveOrder.mutateAsync({ orderId: selectedOrder.id, adminNotes: notes });
        toast.success('تم قبول الطلب بنجاح');
      } else {
        await rejectOrder.mutateAsync({ orderId: selectedOrder.id, adminNotes: notes });
        toast.success('تم رفض الطلب');
      }
      setSelectedOrder(null);
      setActionType(null);
      setNotes('');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    } finally {
      setProcessing(false);
    }
  };

  if (permLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <BackButton />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">طلبات شحن الألعاب</h1>
              <p className="text-muted-foreground text-sm">
                {pendingOrders.length} طلب في الانتظار
              </p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {pendingOrders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">لا توجد طلبات معلقة</h3>
              <p className="text-muted-foreground">
                ستظهر الطلبات الجديدة هنا
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingOrders.map((order: any) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {order.platform?.logo_url && (
                        <img 
                          src={order.platform.logo_url} 
                          alt={order.platform.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <CardTitle className="text-base">
                          {order.platform?.name_ar || order.platform?.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {order.package?.name_ar || order.package?.name}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                      <Clock className="w-3 h-3 mr-1" />
                      معلق
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">ID اللاعب:</span>
                      <p className="font-mono font-medium">{order.player_id}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">المبلغ:</span>
                      <p className="font-bold text-primary">{order.amount} د.ج</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">التاريخ:</span>
                      <p>{format(new Date(order.created_at), 'dd MMM yyyy HH:mm', { locale: ar })}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">المستخدم:</span>
                      <p>{order.profile?.full_name || order.profile?.phone || 'غير معروف'}</p>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <span className="text-sm text-muted-foreground">ملاحظات:</span>
                      <p className="text-sm">{order.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      className="flex-1" 
                      onClick={() => {
                        setSelectedOrder(order);
                        setActionType('approve');
                      }}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      قبول
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedOrder(order);
                        setActionType('reject');
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
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
          setNotes('');
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? 'تأكيد القبول' : 'تأكيد الرفض'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {actionType === 'approve' 
                  ? 'هل أنت متأكد من قبول هذا الطلب؟'
                  : 'هل أنت متأكد من رفض هذا الطلب؟'
                }
              </p>
              <Textarea
                placeholder="ملاحظات (اختياري)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => {
                setSelectedOrder(null);
                setActionType(null);
                setNotes('');
              }}>
                إلغاء
              </Button>
              <Button 
                variant={actionType === 'approve' ? 'default' : 'destructive'}
                onClick={handleAction}
                disabled={processing}
              >
                {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {actionType === 'approve' ? 'تأكيد القبول' : 'تأكيد الرفض'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AgentGameOrders;
