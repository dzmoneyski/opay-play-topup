import { useState, useEffect } from 'react';
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
import { ShoppingCart, Package, TrendingUp, DollarSign, Loader2, ExternalLink, Clipboard, Sparkles, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import BackButton from '@/components/BackButton';
import { supabase } from '@/integrations/supabase/client';

const AliExpress = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { exchangeRate, fees, loading: settingsLoading } = useAliExpressSettings();
  const { createOrder } = useAliExpressOrders();
  const { balance, fetchBalance } = useBalance();
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);
  const [pasteSuccess, setPasteSuccess] = useState(false);

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

  // Check clipboard for AliExpress links
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && (text.includes('aliexpress.com') || text.includes('aliexpress.us'))) {
          setClipboardUrl(text);
        }
      } catch (err) {
        // Clipboard access denied or not available
        console.log('Clipboard access not available');
      }
    };
    
    checkClipboard();
  }, []);

  const handlePasteFromClipboard = async () => {
    if (clipboardUrl) {
      setOrderForm({ ...orderForm, product_url: clipboardUrl });
      setPasteSuccess(true);
      setTimeout(() => setPasteSuccess(false), 2000);
      await extractProductData(clipboardUrl);
    }
  };

  const extractProductData = async (url: string) => {
    if (!url || (!url.includes('aliexpress.com') && !url.includes('aliexpress.us'))) {
      return;
    }

    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-aliexpress', {
        body: { url }
      });

      if (error) throw error;

      if (data?.success && data.data) {
        const { title, price, image } = data.data;
        
        setOrderForm(prev => ({
          ...prev,
          product_title: title || prev.product_title,
          price_usd: price ? price.toString() : prev.price_usd,
          product_image: image || prev.product_image,
        }));

        toast({
          title: '✨ تم استخراج البيانات بنجاح',
          description: 'تم ملء معلومات المنتج تلقائياً',
        });
      } else if (data?.error) {
        toast({
          title: 'تنبيه',
          description: data.error,
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error extracting product data:', error);
      toast({
        title: 'ملاحظة',
        description: 'لم نتمكن من استخراج البيانات تلقائياً. يرجى إدخالها يدوياً',
        variant: 'default',
      });
    } finally {
      setExtracting(false);
    }
  };

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
            {/* Smart Paste Button */}
            {clipboardUrl && !orderForm.product_url && (
              <Alert className="border-primary/50 bg-primary/5">
                <Sparkles className="h-4 w-4 text-primary" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-sm">تم رصد رابط AliExpress في الحافظة!</span>
                  <Button
                    size="sm"
                    onClick={handlePasteFromClipboard}
                    className="mr-2"
                  >
                    {pasteSuccess ? (
                      <>
                        <Check className="ml-1 h-4 w-4" />
                        تم اللصق
                      </>
                    ) : (
                      <>
                        <Clipboard className="ml-1 h-4 w-4" />
                        لصق الرابط
                      </>
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Product Info */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                معلومات المنتج
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="product_url">رابط المنتج من AliExpress *</Label>
                <div className="flex gap-2">
                  <Input
                    id="product_url"
                    placeholder="https://www.aliexpress.com/item/..."
                    value={orderForm.product_url}
                    onChange={(e) => {
                      setOrderForm({ ...orderForm, product_url: e.target.value });
                      if (e.target.value && (e.target.value.includes('aliexpress.com') || e.target.value.includes('aliexpress.us'))) {
                        extractProductData(e.target.value);
                      }
                    }}
                    disabled={extracting}
                  />
                  {extracting && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                </div>
                {extracting && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    جاري استخراج البيانات تلقائياً...
                  </p>
                )}
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

            {/* Real-time Price Calculation */}
            {orderForm.price_usd && (
              <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg space-y-3 border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">ملخص التكلفة الفوري</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm p-2 bg-background/50 rounded">
                    <span className="text-muted-foreground">سعر المنتج:</span>
                    <span className="font-medium">{prices.priceDZD.toFixed(2)} DZD</span>
                  </div>
                  <div className="flex justify-between text-sm p-2 bg-background/50 rounded">
                    <span className="text-muted-foreground">رسوم الخدمة ({fees?.service_fee_percentage}%):</span>
                    <span className="font-medium">{prices.serviceFee.toFixed(2)} DZD</span>
                  </div>
                  <div className="flex justify-between text-sm p-2 bg-background/50 rounded">
                    <span className="text-muted-foreground">رسوم الشحن الدولي:</span>
                    <span className="font-medium">{prices.shippingFee.toFixed(2)} DZD</span>
                  </div>
                </div>
                <div className="h-px bg-primary/20 my-2" />
                <div className="flex justify-between p-3 bg-primary/10 rounded-lg">
                  <span className="text-lg font-bold">المجموع الكلي:</span>
                  <span className="text-xl font-bold text-primary">{prices.totalDZD.toFixed(2)} DZD</span>
                </div>
                {balance && (
                  <div className="text-xs text-center text-muted-foreground mt-2">
                    {balance.balance >= prices.totalDZD ? (
                      <span className="text-green-600 flex items-center justify-center gap-1">
                        <Check className="h-3 w-3" />
                        رصيدك كافٍ لإتمام الطلب
                      </span>
                    ) : (
                      <span className="text-destructive">
                        تحتاج لشحن {(prices.totalDZD - balance.balance).toFixed(2)} DZD إضافية
                      </span>
                    )}
                  </div>
                )}
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
