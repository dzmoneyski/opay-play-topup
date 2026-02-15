import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useP2POrders, P2POrder, getPaymentMethodLabel } from '@/hooks/useP2P';
import { useAuth } from '@/hooks/useAuth';
import { P2POrderChat } from './P2POrderChat';
import { Clock, CheckCircle, XCircle, AlertTriangle, Shield, ArrowLeftRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'في الانتظار', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  escrow_locked: { label: 'محجوز', variant: 'default', icon: <Shield className="h-3 w-3" /> },
  payment_sent: { label: 'تم الدفع', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  payment_confirmed: { label: 'تم التأكيد', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  completed: { label: 'مكتمل', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  cancelled: { label: 'ملغي', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  disputed: { label: 'نزاع', variant: 'destructive', icon: <AlertTriangle className="h-3 w-3" /> },
  dispute_resolved: { label: 'تمت التسوية', variant: 'outline', icon: <CheckCircle className="h-3 w-3" /> },
};

export const P2PMyOrders: React.FC = () => {
  const { orders, loading, refetch } = useP2POrders();
  const { user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<P2POrder | null>(null);

  if (selectedOrder) {
    return (
      <P2POrderChat
        order={selectedOrder}
        onBack={() => { setSelectedOrder(null); refetch(); }}
        onRefresh={refetch}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <ArrowLeftRight className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-lg">لا توجد طلبات بعد</p>
        <p className="text-sm text-muted-foreground mt-1">ابدأ بالتداول من قسم الشراء أو البيع</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map(order => {
        const isBuyer = order.buyer_id === user?.id;
        const st = statusMap[order.status] || statusMap.pending;

        return (
          <div
            key={order.id}
            onClick={() => setSelectedOrder(order)}
            className="bg-card border border-border/50 rounded-xl p-4 cursor-pointer hover:shadow-card transition-all active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={isBuyer ? 'default' : 'secondary'} className="text-xs">
                  {isBuyer ? 'شراء' : 'بيع'}
                </Badge>
                <span className="font-bold">{order.amount.toLocaleString()} د.ج</span>
              </div>
              <Badge variant={st.variant} className="gap-1 text-xs">
                {st.icon}
                {st.label}
              </Badge>
            </div>

            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>{getPaymentMethodLabel(order.payment_method)}</span>
              <span>{formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: ar })}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
