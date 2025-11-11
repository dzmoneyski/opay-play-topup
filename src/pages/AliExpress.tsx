import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAliExpressSettings } from '@/hooks/useAliExpressSettings';
import { useAliExpressOrders } from '@/hooks/useAliExpressOrders';
import { useBalance } from '@/hooks/useBalance';
import { ShoppingCart, Package, TrendingUp, DollarSign, Loader2, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import BackButton from '@/components/BackButton';

const AliExpress = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { exchangeRate, fees, loading: settingsLoading } = useAliExpressSettings();
  const { createOrder } = useAliExpressOrders();
  const { balance, fetchBalance } = useBalance();
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [orderForm, setOrderForm] = useState({
    product_url: '',
    product_title: '',
    product_image: '',
    price_usd: '',
    quantity: '1',
    delivery_name: '',
    delivery_phone: '',
    delivery_address: '',
    notes: ''
  });

  const calculatePrices = () => {
    if (!exchangeRate || !fees || !orderForm.price_usd) {
      return { priceDZD: 0, serviceFee: 0, shippingFee: 0, totalDZD: 0 };
    }

    const priceUSD = parseFloat(orderForm.price_usd);
    const quantity = parseInt(orderForm.quantity) || 1;
    const priceDZD = priceUSD * exchangeRate.rate * quantity;
    
    let serviceFee = (priceDZD * fees.service_fee_percentage) / 100;
    if (serviceFee < fees.min_service_fee) {
      serviceFee = fees.min_service_fee;
    }
    
    const shippingFee = fees.default_shipping_fee;
    const totalDZD = priceDZD + serviceFee + shippingFee;

    return { priceDZD, serviceFee, shippingFee, totalDZD };
  };

  const handleOrderSubmit = () => {
    // Validate form
    if (!orderForm.product_url || !orderForm.product_title || !orderForm.price_usd) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال رابط المنتج والعنوان والسعر',
        variant: 'destructive'
      });
      return;
    }

    if (!orderForm.delivery_name || !orderForm.delivery_phone || !orderForm.delivery_address) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال معلومات التوصيل كاملة',
        variant: 'destructive'
      });
      return;
    }

    setShowOrderDialog(true);
  };

  const confirmOrder = async () => {
    setSubmitting(true);
    try {
      const prices = calculatePrices();
      
      // Check balance
      if (!balance || balance.balance < prices.totalDZD) {
        toast({
          title: 'رصيد غير كافٍ',
          description: 'رصيدك الحالي غير كافٍ لإتمام هذا الطلب',
          variant: 'destructive'
        });
        setSubmitting(false);
        return;
      }

      await createOrder({
        product_url: orderForm.product_url,
        product_title: orderForm.product_title,
        product_image: orderForm.product_image || null,
        price_usd: parseFloat(orderForm.price_usd),
        price_dzd: prices.priceDZD,
        exchange_rate: exchangeRate!.rate,
        service_fee: prices.serviceFee,
        shipping_fee: prices.shippingFee,
        total_dzd: prices.totalDZD,
        quantity: parseInt(orderForm.quantity),
        delivery_address: orderForm.delivery_address,
        delivery_phone: orderForm.delivery_phone,
        delivery_name: orderForm.delivery_name,
        notes: orderForm.notes || undefined
      });

      // Refresh balance
      await fetchBalance();

      toast({
        title: 'تم إنشاء الطلب بنجاح',
        description: 'سيتم معالجة طلبك في أقرب وقت ممكن'
      });

      setShowOrderDialog(false);
      setOrderForm({
        product_url: '',
        product_title: '',
        product_image: '',
        price_usd: '',
        quantity: '1',
        delivery_name: '',
        delivery_phone: '',
        delivery_address: '',
        notes: ''
      });

      // Navigate to orders page
      setTimeout(() => navigate('/transactions'), 1000);
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إنشاء الطلب',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const prices = calculatePrices();

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <BackButton />
        
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            التسوق من AliExpress
          </h1>
          <p className="text-muted-foreground">
            اطلب أي منتج من AliExpress وادفع بالدينار الجزائري
          </p>
        </div>

        {/* Exchange Rate Info */}
        <Alert className="mb-6">
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            سعر الصرف الحالي: <strong>1 USD = {exchangeRate?.rate} DZD</strong>
          </AlertDescription>
        </Alert>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">رسوم الخدمة</p>
                  <p className="text-xl font-bold">{fees?.service_fee_percentage}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">رسوم الشحن</p>
                  <p className="text-xl font-bold">{fees?.default_shipping_fee} DZD</p>
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
                  <p className="text-sm text-muted-foreground">رصيدك</p>
                  <p className="text-xl font-bold">{balance?.balance.toFixed(2)} DZD</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Form */}
        <Card>
          <CardHeader>
            <CardTitle>طلب منتج جديد</CardTitle>
            <CardDescription>
              انسخ رابط المنتج من AliExpress وأدخل المعلومات المطلوبة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Info */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                معلومات المنتج
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="product_url">رابط المنتج من AliExpress *</Label>
                <Input
                  id="product_url"
                  placeholder="https://www.aliexpress.com/item/..."
                  value={orderForm.product_url}
                  onChange={(e) => setOrderForm({ ...orderForm, product_url: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product_title">عنوان المنتج *</Label>
                <Input
                  id="product_title"
                  placeholder="مثال: ساعة ذكية XYZ"
                  value={orderForm.product_title}
                  onChange={(e) => setOrderForm({ ...orderForm, product_title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product_image">رابط صورة المنتج (اختياري)</Label>
                <Input
                  id="product_image"
                  placeholder="https://..."
                  value={orderForm.product_image}
                  onChange={(e) => setOrderForm({ ...orderForm, product_image: e.target.value })}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price_usd">سعر المنتج (بالدولار) *</Label>
                  <Input
                    id="price_usd"
                    type="number"
                    step="0.01"
                    placeholder="25.00"
                    value={orderForm.price_usd}
                    onChange={(e) => setOrderForm({ ...orderForm, price_usd: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">الكمية *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" />
                معلومات التوصيل
              </h3>

              <div className="space-y-2">
                <Label htmlFor="delivery_name">الاسم الكامل *</Label>
                <Input
                  id="delivery_name"
                  placeholder="الاسم الكامل للمستلم"
                  value={orderForm.delivery_name}
                  onChange={(e) => setOrderForm({ ...orderForm, delivery_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_phone">رقم الهاتف *</Label>
                <Input
                  id="delivery_phone"
                  placeholder="0555123456"
                  value={orderForm.delivery_phone}
                  onChange={(e) => setOrderForm({ ...orderForm, delivery_phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_address">العنوان الكامل *</Label>
                <Textarea
                  id="delivery_address"
                  placeholder="الولاية، البلدية، الحي، رقم المنزل..."
                  value={orderForm.delivery_address}
                  onChange={(e) => setOrderForm({ ...orderForm, delivery_address: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات إضافية (اختياري)</Label>
                <Textarea
                  id="notes"
                  placeholder="أي ملاحظات خاصة بالطلب..."
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            {/* Price Calculation */}
            {orderForm.price_usd && (
              <div className="p-4 bg-primary/5 rounded-lg space-y-2">
                <h3 className="font-semibold mb-3">ملخص التكلفة</h3>
                <div className="flex justify-between text-sm">
                  <span>سعر المنتج:</span>
                  <span>{prices.priceDZD.toFixed(2)} DZD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>رسوم الخدمة ({fees?.service_fee_percentage}%):</span>
                  <span>{prices.serviceFee.toFixed(2)} DZD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>رسوم الشحن الدولي:</span>
                  <span>{prices.shippingFee.toFixed(2)} DZD</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>المجموع الكلي:</span>
                  <span className="text-primary">{prices.totalDZD.toFixed(2)} DZD</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleOrderSubmit}
              className="w-full"
              size="lg"
              disabled={!orderForm.product_url || !orderForm.product_title || !orderForm.price_usd}
            >
              <ShoppingCart className="ml-2 h-5 w-5" />
              طلب المنتج الآن
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الطلب</DialogTitle>
            <DialogDescription>
              يرجى مراجعة تفاصيل طلبك قبل التأكيد
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="font-semibold">{orderForm.product_title}</p>
              <p className="text-sm text-muted-foreground">الكمية: {orderForm.quantity}</p>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>سعر المنتج:</span>
                <span>{prices.priceDZD.toFixed(2)} DZD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>رسوم الخدمة:</span>
                <span>{prices.serviceFee.toFixed(2)} DZD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>رسوم الشحن:</span>
                <span>{prices.shippingFee.toFixed(2)} DZD</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between font-bold">
                <span>المجموع:</span>
                <span className="text-primary">{prices.totalDZD.toFixed(2)} DZD</span>
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg">
              <div className="flex justify-between text-sm mb-1">
                <span>رصيدك الحالي:</span>
                <span>{balance?.balance.toFixed(2)} DZD</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span>الرصيد بعد الدفع:</span>
                <span className={balance && balance.balance >= prices.totalDZD ? 'text-green-600' : 'text-red-600'}>
                  {balance ? (balance.balance - prices.totalDZD).toFixed(2) : '0.00'} DZD
                </span>
              </div>
            </div>

            {balance && balance.balance < prices.totalDZD && (
              <Alert variant="destructive">
                <AlertDescription>
                  رصيدك غير كافٍ لإتمام هذا الطلب. يرجى شحن رصيدك أولاً.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowOrderDialog(false)}
              disabled={submitting}
            >
              إلغاء
            </Button>
            <Button
              onClick={confirmOrder}
              disabled={submitting || !balance || balance.balance < prices.totalDZD}
            >
              {submitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <ShoppingCart className="ml-2 h-4 w-4" />
                  تأكيد ودفع
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AliExpress;
