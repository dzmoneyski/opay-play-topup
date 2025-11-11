import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAliExpressSettings } from '@/hooks/useAliExpressSettings';
import { useAliExpressOrders, AliExpressOrder } from '@/hooks/useAliExpressOrders';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, DollarSign, TrendingUp, Loader2, Eye, CheckCircle, XCircle, Truck, ShoppingCart, ExternalLink } from 'lucide-react';
import { AdminNavbar } from '@/components/AdminNavbar';
import { AdminSidebar } from '@/components/AdminSidebar';

const AliExpressOrders = () => {
  const { toast } = useToast();
  const { exchangeRate, fees, updateExchangeRate, updateFees } = useAliExpressSettings();
  const { orders, loading, updateOrderStatus } = useAliExpressOrders(true);
  const [selectedOrder, setSelectedOrder] = useState<AliExpressOrder | null>(null);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [settingsForm, setSettingsForm] = useState({
    exchange_rate: exchangeRate?.rate.toString() || '',
    service_fee_percentage: fees?.service_fee_percentage.toString() || '',
    default_shipping_fee: fees?.default_shipping_fee.toString() || '',
    min_service_fee: fees?.min_service_fee.toString() || ''
  });

  const [orderUpdate, setOrderUpdate] = useState({
    status: '',
    admin_notes: '',
    tracking_number: ''
  });

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500',
    purchased: 'bg-blue-500',
    shipped: 'bg-purple-500',
    delivered: 'bg-green-500',
    cancelled: 'bg-red-500'
  };

  const statusLabels: Record<string, string> = {
    pending: 'قيد الانتظار',
    purchased: 'تم الشراء',
    shipped: 'تم الشحن',
    delivered: 'تم التوصيل',
    cancelled: 'ملغي'
  };

  const handleUpdateSettings = async () => {
    setUpdating(true);
    try {
      await updateExchangeRate(parseFloat(settingsForm.exchange_rate));
      await updateFees({
        service_fee_percentage: parseFloat(settingsForm.service_fee_percentage),
        default_shipping_fee: parseFloat(settingsForm.default_shipping_fee),
        min_service_fee: parseFloat(settingsForm.min_service_fee)
      });

      toast({
        title: 'تم التحديث بنجاح',
        description: 'تم تحديث إعدادات AliExpress'
      });
      setShowSettingsDialog(false);
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث الإعدادات',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;

    setUpdating(true);
    try {
      await updateOrderStatus(
        selectedOrder.id,
        orderUpdate.status,
        orderUpdate.admin_notes,
        orderUpdate.tracking_number
      );

      toast({
        title: 'تم التحديث بنجاح',
        description: 'تم تحديث حالة الطلب'
      });
      setSelectedOrder(null);
      setOrderUpdate({ status: '', admin_notes: '', tracking_number: '' });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث الطلب',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.service_fee + o.shipping_fee), 0);

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">
      <AdminSidebar />
      <div className="flex-1">
        <AdminNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">إدارة طلبات AliExpress</h1>
              <p className="text-muted-foreground">إدارة طلبات المستخدمين من AliExpress</p>
            </div>
            <Button onClick={() => setShowSettingsDialog(true)}>
              <TrendingUp className="ml-2 h-4 w-4" />
              إعدادات الأسعار
            </Button>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <Package className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">طلبات معلقة</p>
                    <p className="text-2xl font-bold">{pendingOrders.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                    <p className="text-2xl font-bold">{orders.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي الأرباح</p>
                    <p className="text-2xl font-bold">{totalRevenue.toFixed(2)} DZD</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">سعر الصرف</p>
                    <p className="text-2xl font-bold">{exchangeRate?.rate} DZD</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>جميع الطلبات</CardTitle>
              <CardDescription>قائمة بجميع طلبات AliExpress</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد طلبات
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>المنتج</TableHead>
                      <TableHead>السعر</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.user?.full_name || 'غير محدد'}</p>
                            <p className="text-sm text-muted-foreground">{order.user?.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="font-medium truncate">{order.product_title}</p>
                            <p className="text-sm text-muted-foreground">
                              الكمية: {order.quantity}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-bold">{order.total_dzd.toFixed(2)} DZD</p>
                            <p className="text-sm text-muted-foreground">
                              ${order.price_usd.toFixed(2)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[order.status]}>
                            {statusLabels[order.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString('ar-DZ')}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order);
                              setOrderUpdate({
                                status: order.status,
                                admin_notes: order.admin_notes || '',
                                tracking_number: order.tracking_number || ''
                              });
                            }}
                          >
                            <Eye className="h-4 w-4 ml-1" />
                            عرض
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>إعدادات الأسعار والرسوم</DialogTitle>
            <DialogDescription>
              تحديث سعر الصرف ورسوم الخدمة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exchange_rate">سعر الصرف (1 USD = ... DZD)</Label>
              <Input
                id="exchange_rate"
                type="number"
                step="0.01"
                value={settingsForm.exchange_rate}
                onChange={(e) => setSettingsForm({ ...settingsForm, exchange_rate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_fee">نسبة رسوم الخدمة (%)</Label>
              <Input
                id="service_fee"
                type="number"
                step="0.1"
                value={settingsForm.service_fee_percentage}
                onChange={(e) => setSettingsForm({ ...settingsForm, service_fee_percentage: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipping_fee">رسوم الشحن الافتراضية (DZD)</Label>
              <Input
                id="shipping_fee"
                type="number"
                value={settingsForm.default_shipping_fee}
                onChange={(e) => setSettingsForm({ ...settingsForm, default_shipping_fee: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_fee">الحد الأدنى لرسوم الخدمة (DZD)</Label>
              <Input
                id="min_fee"
                type="number"
                value={settingsForm.min_service_fee}
                onChange={(e) => setSettingsForm({ ...settingsForm, min_service_fee: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdateSettings} disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                'حفظ التغييرات'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Product Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">معلومات المنتج</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedOrder.product_image && (
                    <img
                      src={selectedOrder.product_image}
                      alt={selectedOrder.product_title}
                      className="w-full h-48 object-cover rounded-lg mb-2"
                    />
                  )}
                  <div>
                    <p className="font-semibold">{selectedOrder.product_title}</p>
                    <a
                      href={selectedOrder.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      رابط المنتج على AliExpress
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">السعر بالدولار</p>
                      <p className="font-bold">${selectedOrder.price_usd.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">الكمية</p>
                      <p className="font-bold">{selectedOrder.quantity}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">تفاصيل السعر</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>سعر المنتج:</span>
                    <span>{selectedOrder.price_dzd.toFixed(2)} DZD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>رسوم الخدمة:</span>
                    <span>{selectedOrder.service_fee.toFixed(2)} DZD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>رسوم الشحن:</span>
                    <span>{selectedOrder.shipping_fee.toFixed(2)} DZD</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>المجموع:</span>
                    <span className="text-primary">{selectedOrder.total_dzd.toFixed(2)} DZD</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    سعر الصرف المستخدم: 1 USD = {selectedOrder.exchange_rate} DZD
                  </p>
                </CardContent>
              </Card>

              {/* Delivery Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">معلومات التوصيل</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">الاسم</p>
                    <p className="font-medium">{selectedOrder.delivery_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                    <p className="font-medium">{selectedOrder.delivery_phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">العنوان</p>
                    <p className="font-medium">{selectedOrder.delivery_address}</p>
                  </div>
                  {selectedOrder.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">ملاحظات العميل</p>
                      <p className="font-medium">{selectedOrder.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Update Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">تحديث الحالة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>الحالة</Label>
                    <Select value={orderUpdate.status} onValueChange={(value) => setOrderUpdate({ ...orderUpdate, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">قيد الانتظار</SelectItem>
                        <SelectItem value="purchased">تم الشراء</SelectItem>
                        <SelectItem value="shipped">تم الشحن</SelectItem>
                        <SelectItem value="delivered">تم التوصيل</SelectItem>
                        <SelectItem value="cancelled">ملغي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>رقم التتبع</Label>
                    <Input
                      placeholder="رقم تتبع الشحنة"
                      value={orderUpdate.tracking_number}
                      onChange={(e) => setOrderUpdate({ ...orderUpdate, tracking_number: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>ملاحظات الإدارة</Label>
                    <Textarea
                      placeholder="ملاحظات للعميل..."
                      value={orderUpdate.admin_notes}
                      onChange={(e) => setOrderUpdate({ ...orderUpdate, admin_notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdateOrder} disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                <>
                  <CheckCircle className="ml-2 h-4 w-4" />
                  حفظ التحديثات
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AliExpressOrders;
