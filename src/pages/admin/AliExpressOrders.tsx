import { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, DollarSign, TrendingUp, Loader2, Eye, CheckCircle, XCircle, Truck, ShoppingCart, ExternalLink, Settings2, Filter } from 'lucide-react';
import { AdminNavbar } from '@/components/AdminNavbar';
import { AdminSidebar } from '@/components/AdminSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

const AliExpressOrders = () => {
  const { toast } = useToast();
  const { exchangeRate, fees, updateExchangeRate, updateFees } = useAliExpressSettings();
  const { orders, loading, updateOrderStatus } = useAliExpressOrders(true);
  const [selectedOrder, setSelectedOrder] = useState<AliExpressOrder | null>(null);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [settingsForm, setSettingsForm] = useState({
    exchange_rate: '',
    service_fee_percentage: '',
    default_shipping_fee: '',
    min_service_fee: ''
  });

  useEffect(() => {
    if (exchangeRate && fees) {
      setSettingsForm({
        exchange_rate: exchangeRate.rate.toString(),
        service_fee_percentage: fees.service_fee_percentage.toString(),
        default_shipping_fee: fees.default_shipping_fee.toString(),
        min_service_fee: fees.min_service_fee.toString()
      });
    }
  }, [exchangeRate, fees]);

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
  const processingOrders = orders.filter(o => o.status === 'purchased' || o.status === 'shipped');
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.service_fee + o.shipping_fee), 0);

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-background to-blue-50 dark:from-gray-900 dark:via-background dark:to-gray-900 flex w-full" dir="rtl">
        <AdminSidebar />
        <div className="flex-1">
          <AdminNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-orange-500 to-blue-500 rounded-lg">
                  <ShoppingCart className="h-7 w-7 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-red-500 to-blue-600 bg-clip-text text-transparent">
                  إدارة طلبات AliExpress
                </h1>
              </div>
              <p className="text-muted-foreground text-lg mr-14">إدارة ومتابعة طلبات المستخدمين من AliExpress</p>
            </div>
            <Button 
              onClick={() => setShowSettingsDialog(true)}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg"
              size="lg"
            >
              <Settings2 className="ml-2 h-5 w-5" />
              إعدادات الأسعار
            </Button>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-400 to-orange-500 text-white hover:scale-105 transition-transform cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Package className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm text-yellow-100">طلبات معلقة</p>
                    <p className="text-3xl font-black">{pendingOrders.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white hover:scale-105 transition-transform cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Truck className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-100">قيد المعالجة</p>
                    <p className="text-3xl font-black">{processingOrders.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white hover:scale-105 transition-transform cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <CheckCircle className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm text-green-100">تم التوصيل</p>
                    <p className="text-3xl font-black">{deliveredOrders.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-pink-500 to-rose-600 text-white hover:scale-105 transition-transform cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <DollarSign className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm text-pink-100">إجمالي الأرباح</p>
                    <p className="text-3xl font-black">{totalRevenue.toFixed(0)}</p>
                    <p className="text-xs text-pink-200">DZD</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Orders Table */}
          <Card className="border-0 shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-blue-50 dark:from-gray-800 dark:to-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">جميع الطلبات</CardTitle>
                  <CardDescription className="text-base">قائمة بجميع طلبات AliExpress من المستخدمين</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Filter className="h-5 w-5 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="فلترة حسب الحالة" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">جميع الطلبات</SelectItem>
                      <SelectItem value="pending">معلقة</SelectItem>
                      <SelectItem value="purchased">تم الشراء</SelectItem>
                      <SelectItem value="shipped">تم الشحن</SelectItem>
                      <SelectItem value="delivered">تم التوصيل</SelectItem>
                      <SelectItem value="cancelled">ملغية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-12 w-12 animate-spin text-orange-500 mb-4" />
                  <p className="text-muted-foreground">جاري تحميل الطلبات...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-xl font-semibold text-muted-foreground mb-2">لا توجد طلبات</p>
                  <p className="text-sm text-muted-foreground">لم يتم إضافة أي طلبات بعد</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-bold">المستخدم</TableHead>
                        <TableHead className="font-bold">المنتج</TableHead>
                        <TableHead className="font-bold">السعر</TableHead>
                        <TableHead className="font-bold">الحالة</TableHead>
                        <TableHead className="font-bold">التاريخ</TableHead>
                        <TableHead className="font-bold">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                {order.user?.full_name?.charAt(0) || 'م'}
                              </div>
                              <div>
                                <p className="font-semibold">{order.user?.full_name || 'غير محدد'}</p>
                                <p className="text-sm text-muted-foreground">{order.user?.phone}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3 max-w-xs">
                              {order.product_image && (
                                <img 
                                  src={order.product_image} 
                                  alt={order.product_title}
                                  className="h-12 w-12 rounded-lg object-cover"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{order.product_title}</p>
                                <p className="text-sm text-muted-foreground">
                                  الكمية: {order.quantity}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-bold text-lg text-orange-600">{order.total_dzd.toFixed(2)} DZD</p>
                              <p className="text-sm text-muted-foreground">
                                ${order.price_usd.toFixed(2)} USD
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[order.status]} text-white shadow-md`}>
                              {statusLabels[order.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div>
                              <p className="font-medium">{new Date(order.created_at).toLocaleDateString('ar-DZ')}</p>
                              <p className="text-muted-foreground">{new Date(order.created_at).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md"
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
                              عرض التفاصيل
                            </Button>
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
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent dir="rtl" className="max-w-xl bg-gradient-to-br from-orange-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-r from-orange-500 to-blue-500 rounded-lg">
                <Settings2 className="h-6 w-6 text-white" />
              </div>
              <DialogTitle className="text-2xl">إعدادات الأسعار والرسوم</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              قم بتحديث سعر الصرف ورسوم الخدمة والشحن لجميع المنتجات
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-3 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-orange-200 dark:border-orange-800">
              <Label htmlFor="exchange_rate" className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                سعر الصرف (USD → DZD)
              </Label>
              <Input
                id="exchange_rate"
                type="number"
                step="0.01"
                value={settingsForm.exchange_rate}
                onChange={(e) => setSettingsForm({ ...settingsForm, exchange_rate: e.target.value })}
                className="text-lg font-semibold"
                placeholder="270.00"
              />
              <p className="text-sm text-muted-foreground">مثال: 1 USD = 270 DZD</p>
            </div>

            <div className="space-y-3 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <Label htmlFor="service_fee" className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-500" />
                نسبة رسوم الخدمة (%)
              </Label>
              <Input
                id="service_fee"
                type="number"
                step="0.1"
                value={settingsForm.service_fee_percentage}
                onChange={(e) => setSettingsForm({ ...settingsForm, service_fee_percentage: e.target.value })}
                className="text-lg font-semibold"
                placeholder="1.0"
              />
              <p className="text-sm text-muted-foreground">مثال: 1% من سعر المنتج</p>
            </div>

            <div className="space-y-3 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-purple-200 dark:border-purple-800">
              <Label htmlFor="shipping_fee" className="text-base font-semibold flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-500" />
                رسوم الشحن الافتراضية (DZD)
              </Label>
              <Input
                id="shipping_fee"
                type="number"
                value={settingsForm.default_shipping_fee}
                onChange={(e) => setSettingsForm({ ...settingsForm, default_shipping_fee: e.target.value })}
                className="text-lg font-semibold"
                placeholder="800"
              />
              <p className="text-sm text-muted-foreground">رسوم ثابتة لكل طلب</p>
            </div>

            <div className="space-y-3 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-green-200 dark:border-green-800">
              <Label htmlFor="min_fee" className="text-base font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                الحد الأدنى لرسوم الخدمة (DZD)
              </Label>
              <Input
                id="min_fee"
                type="number"
                value={settingsForm.min_service_fee}
                onChange={(e) => setSettingsForm({ ...settingsForm, min_service_fee: e.target.value })}
                className="text-lg font-semibold"
                placeholder="100"
              />
              <p className="text-sm text-muted-foreground">أقل رسوم خدمة ممكنة</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowSettingsDialog(false)}
              size="lg"
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleUpdateSettings} 
              disabled={updating}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              size="lg"
            >
              {updating ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <CheckCircle className="ml-2 h-5 w-5" />
                  حفظ التغييرات
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white via-orange-50/30 to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-orange-500 to-blue-500 rounded-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <DialogTitle className="text-2xl">تفاصيل الطلب الكامل</DialogTitle>
            </div>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-5">
              {/* Product Info */}
              <Card className="border-2 border-orange-200 dark:border-orange-800 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-orange-500" />
                    معلومات المنتج
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {selectedOrder.product_image && (
                    <img
                      src={selectedOrder.product_image}
                      alt={selectedOrder.product_title}
                      className="w-full h-56 object-cover rounded-xl border-2 border-orange-200"
                    />
                  )}
                  <div>
                    <p className="font-bold text-lg">{selectedOrder.product_title}</p>
                    <a
                      href={selectedOrder.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 mt-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      فتح المنتج على AliExpress
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">السعر بالدولار</p>
                      <p className="font-black text-xl text-blue-600">${selectedOrder.price_usd.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">الكمية</p>
                      <p className="font-black text-xl text-purple-600">{selectedOrder.quantity}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing */}
              <Card className="border-2 border-yellow-200 dark:border-yellow-800 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-yellow-600" />
                    تفاصيل السعر والأرباح
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="font-medium">سعر المنتج:</span>
                    <span className="font-bold">{selectedOrder.price_dzd.toFixed(2)} DZD</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <span className="font-medium">رسوم الخدمة (ربح):</span>
                    <span className="font-bold text-green-600">+{selectedOrder.service_fee.toFixed(2)} DZD</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <span className="font-medium">رسوم الشحن (ربح):</span>
                    <span className="font-bold text-green-600">+{selectedOrder.shipping_fee.toFixed(2)} DZD</span>
                  </div>
                  <div className="h-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full my-2" />
                  <div className="flex justify-between p-3 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-950/40 dark:to-orange-950/40 rounded-xl">
                    <span className="font-bold text-lg">المجموع الكلي:</span>
                    <span className="font-black text-2xl text-orange-600">{selectedOrder.total_dzd.toFixed(2)} DZD</span>
                  </div>
                  <p className="text-sm text-center text-muted-foreground mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    💱 سعر الصرف المستخدم: <strong>1 USD = {selectedOrder.exchange_rate} DZD</strong>
                  </p>
                </CardContent>
              </Card>

              {/* Delivery Info */}
              <Card className="border-2 border-blue-200 dark:border-blue-800 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-500" />
                    معلومات التوصيل
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-muted-foreground mb-1">👤 الاسم الكامل</p>
                    <p className="font-bold text-lg">{selectedOrder.delivery_name}</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-muted-foreground mb-1">📱 رقم الهاتف</p>
                    <p className="font-bold text-lg" dir="ltr">{selectedOrder.delivery_phone}</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-muted-foreground mb-1">📍 العنوان الكامل</p>
                    <p className="font-medium">{selectedOrder.delivery_address}</p>
                  </div>
                  {selectedOrder.notes && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-muted-foreground mb-1">📝 ملاحظات العميل</p>
                      <p className="font-medium">{selectedOrder.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Update Status */}
              <Card className="border-2 border-green-200 dark:border-green-800 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    تحديث حالة الطلب
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">حالة الطلب</Label>
                    <Select value={orderUpdate.status} onValueChange={(value) => setOrderUpdate({ ...orderUpdate, status: value })}>
                      <SelectTrigger className="text-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="pending">⏳ قيد الانتظار</SelectItem>
                        <SelectItem value="purchased">🛒 تم الشراء</SelectItem>
                        <SelectItem value="shipped">📦 تم الشحن</SelectItem>
                        <SelectItem value="delivered">✅ تم التوصيل</SelectItem>
                        <SelectItem value="cancelled">❌ ملغي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-semibold">رقم التتبع (Tracking Number)</Label>
                    <Input
                      placeholder="مثال: LY123456789CN"
                      value={orderUpdate.tracking_number}
                      onChange={(e) => setOrderUpdate({ ...orderUpdate, tracking_number: e.target.value })}
                      className="text-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-semibold">ملاحظات للعميل</Label>
                    <Textarea
                      placeholder="أي ملاحظات أو تحديثات للعميل..."
                      value={orderUpdate.admin_notes}
                      onChange={(e) => setOrderUpdate({ ...orderUpdate, admin_notes: e.target.value })}
                      rows={3}
                      className="text-base"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setSelectedOrder(null)}
              size="lg"
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleUpdateOrder} 
              disabled={updating}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              size="lg"
            >
              {updating ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                <>
                  <CheckCircle className="ml-2 h-5 w-5" />
                  حفظ جميع التحديثات
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </SidebarProvider>
  );
};

export default AliExpressOrders;
