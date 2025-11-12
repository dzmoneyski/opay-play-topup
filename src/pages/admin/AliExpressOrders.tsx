import { useState } from 'react';
import { AdminNavbar } from '@/components/AdminNavbar';
import { AdminSidebar } from '@/components/AdminSidebar';
import { useAdminAliExpressOrders } from '@/hooks/useAdminAliExpressOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ExternalLink, Package, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const AliExpressOrders = () => {
  const { orders, isLoading, updateOrderStatus } = useAdminAliExpressOrders();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      processing: 'secondary',
      completed: 'default',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      paid: 'default',
      refunded: 'destructive',
    };
    return <Badge variant={variants[paymentStatus] || 'default'}>{paymentStatus}</Badge>;
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;

    await updateOrderStatus.mutateAsync({
      orderId: selectedOrder.id,
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
      adminNotes: adminNotes || undefined,
      trackingNumber: trackingNumber || undefined,
    });

    setSelectedOrder(null);
    setStatus('');
    setPaymentStatus('');
    setAdminNotes('');
    setTrackingNumber('');
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground">طلبات AliExpress</h1>
                <p className="text-muted-foreground">إدارة ومتابعة طلبات المنتجات من AliExpress</p>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">جاري التحميل...</div>
            ) : orders?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لا توجد طلبات حالياً</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {orders?.map((order) => (
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{order.product_title}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {order.profiles?.full_name} - {order.profiles?.phone}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {getStatusBadge(order.status)}
                          {getPaymentStatusBadge(order.payment_status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {order.product_image && (
                          <div>
                            <img
                              src={order.product_image}
                              alt={order.product_title}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          </div>
                        )}
                        <div>
                          <Label className="text-xs text-muted-foreground">السعر</Label>
                          <p className="font-semibold flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${order.price_usd.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">الشحن</Label>
                          <p className="font-semibold">${order.shipping_cost_usd.toFixed(2)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">المجموع النهائي</Label>
                          <p className="font-semibold text-primary">
                            {order.final_total_dzd.toFixed(2)} دج
                          </p>
                        </div>
                      </div>

                      {order.tracking_number && (
                        <div className="mb-4 p-3 bg-muted rounded-lg">
                          <Label className="text-xs text-muted-foreground">رقم التتبع</Label>
                          <p className="font-mono">{order.tracking_number}</p>
                        </div>
                      )}

                      {order.admin_notes && (
                        <div className="mb-4 p-3 bg-muted rounded-lg">
                          <Label className="text-xs text-muted-foreground">ملاحظات المشرف</Label>
                          <p>{order.admin_notes}</p>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), 'PPp', { locale: ar })}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(order.product_url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 ml-2" />
                            عرض المنتج
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setStatus(order.status);
                                  setPaymentStatus(order.payment_status);
                                  setAdminNotes(order.admin_notes || '');
                                  setTrackingNumber(order.tracking_number || '');
                                }}
                              >
                                تحديث الحالة
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>تحديث الطلب</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>حالة الطلب</Label>
                                  <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">قيد الانتظار</SelectItem>
                                      <SelectItem value="processing">جاري المعالجة</SelectItem>
                                      <SelectItem value="completed">مكتمل</SelectItem>
                                      <SelectItem value="cancelled">ملغي</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label>حالة الدفع</Label>
                                  <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">قيد الانتظار</SelectItem>
                                      <SelectItem value="paid">مدفوع</SelectItem>
                                      <SelectItem value="refunded">مسترد</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label>رقم التتبع</Label>
                                  <Input
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="أدخل رقم التتبع"
                                  />
                                </div>

                                <div>
                                  <Label>ملاحظات المشرف</Label>
                                  <Textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="أضف ملاحظات..."
                                    rows={3}
                                  />
                                </div>

                                <Button
                                  onClick={handleUpdateOrder}
                                  className="w-full"
                                  disabled={updateOrderStatus.isPending}
                                >
                                  {updateOrderStatus.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AliExpressOrders;
