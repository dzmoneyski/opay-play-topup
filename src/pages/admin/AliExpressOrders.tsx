import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminAliExpressOrders } from '@/hooks/useAdminAliExpressOrders';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ExternalLink, Package, CheckCircle, XCircle, Clock } from 'lucide-react';

const AliExpressOrders = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const { toast } = useToast();
  const { orders, isLoading, updateOrderStatus, isUpdating } = useAdminAliExpressOrders();
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Protect route - Only admins can access
  useEffect(() => {
    if (!rolesLoading && !isAdmin) {
      toast({
        title: "صلاحيات محدودة",
        description: "هذه الصفحة متاحة للمشرفين فقط",
        variant: "destructive"
      });
      navigate('/');
    }
  }, [isAdmin, rolesLoading, navigate, toast]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'قيد الانتظار', variant: 'secondary' },
      processing: { label: 'قيد المعالجة', variant: 'default' },
      completed: { label: 'مكتمل', variant: 'outline' },
      cancelled: { label: 'ملغي', variant: 'destructive' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    updateOrderStatus({
      orderId,
      status: newStatus,
      adminNotes: selectedOrder === orderId ? adminNotes : undefined,
    });
    setSelectedOrder(null);
    setAdminNotes('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-6 h-6" />
            طلبات AliExpress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد طلبات حالياً</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الطلب</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الأسعار</TableHead>
                    <TableHead>معلومات التوصيل</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        {order.id.substring(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{order.customer_name}</p>
                          <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <a
                            href={order.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline text-sm"
                          >
                            رابط المنتج
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          {order.product_images && order.product_images.length > 0 && (
                            <img
                              src={order.product_images[0]}
                              alt="Product"
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <p>المنتج: ${order.product_price.toFixed(2)}</p>
                          <p>الشحن: ${order.shipping_cost.toFixed(2)}</p>
                          <p className="font-semibold">الإجمالي: ${order.total_usd.toFixed(2)}</p>
                          <p className="text-primary font-bold">{order.total_dzd.toFixed(2)} دج</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm max-w-xs">
                          <p className="text-muted-foreground">{order.customer_address}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {order.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(order.id, 'processing')}
                                disabled={isUpdating}
                                className="w-full"
                              >
                                <Clock className="w-3 h-3 ml-1" />
                                قيد المعالجة
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(order.id, 'completed')}
                                disabled={isUpdating}
                                className="w-full"
                              >
                                <CheckCircle className="w-3 h-3 ml-1" />
                                إتمام
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                                disabled={isUpdating}
                                className="w-full"
                              >
                                <XCircle className="w-3 h-3 ml-1" />
                                إلغاء
                              </Button>
                            </>
                          )}
                          
                          {selectedOrder === order.id && (
                            <Textarea
                              placeholder="ملاحظات المشرف..."
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                              className="mt-2"
                            />
                          )}
                          
                          {order.admin_notes && (
                            <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                              {order.admin_notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AliExpressOrders;
