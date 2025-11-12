import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRight, ShoppingCart, DollarSign, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useAliExpressSettings } from '@/hooks/useAliExpressSettings';
import { useAliExpressOrders } from '@/hooks/useAliExpressOrders';
import { useBalance } from '@/hooks/useBalance';
import BackButton from '@/components/BackButton';

const urlSchema = z.object({
  url: z.string().url({ message: 'الرجاء إدخال رابط صحيح' }),
});

const priceSchema = z.object({
  productPrice: z.string().min(1, { message: 'الرجاء إدخال سعر المنتج' }),
  shippingCost: z.string().min(1, { message: 'الرجاء إدخال سعر الشحن' }),
});

const customerInfoSchema = z.object({
  customerName: z.string().min(3, { message: 'الرجاء إدخال الاسم الكامل' }),
  customerPhone: z.string().min(10, { message: 'الرجاء إدخال رقم هاتف صحيح' }),
  customerAddress: z.string().min(10, { message: 'الرجاء إدخال العنوان بالتفصيل' }),
});

const AliExpress = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [productUrl, setProductUrl] = useState('');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productPrice, setProductPrice] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });
  
  const { exchangeRate } = useAliExpressSettings();
  const { createOrder, isCreating } = useAliExpressOrders();
  const { balance } = useBalance();

  const urlForm = useForm<z.infer<typeof urlSchema>>({
    resolver: zodResolver(urlSchema),
  });

  const priceForm = useForm<z.infer<typeof priceSchema>>({
    resolver: zodResolver(priceSchema),
  });

  const customerForm = useForm<z.infer<typeof customerInfoSchema>>({
    resolver: zodResolver(customerInfoSchema),
  });

  const onUrlSubmit = async (values: z.infer<typeof urlSchema>) => {
    setProductUrl(values.url);
    // Extract images from AliExpress URL (simplified - just use placeholder for now)
    setProductImages(['https://images.unsplash.com/photo-1523275335684-37898b6baf30']);
    setStep(2);
  };

  const onPriceSubmit = (values: z.infer<typeof priceSchema>) => {
    setProductPrice(parseFloat(values.productPrice));
    setShippingCost(parseFloat(values.shippingCost));
    setStep(3);
  };

  const onCustomerInfoSubmit = (values: z.infer<typeof customerInfoSchema>) => {
    setCustomerInfo({
      name: values.customerName,
      phone: values.customerPhone,
      address: values.customerAddress,
    });
    setStep(4);
  };

  const handlePayment = () => {
    const totalUSD = productPrice + shippingCost;
    const totalDZD = totalUSD * exchangeRate;

    if (!balance || balance.balance < totalDZD) {
      alert('رصيدك غير كافٍ لإتمام هذا الطلب');
      return;
    }

    createOrder({
      product_url: productUrl,
      product_images: productImages,
      product_price: productPrice,
      shipping_cost: shippingCost,
      total_usd: totalUSD,
      total_dzd: totalDZD,
      exchange_rate: exchangeRate,
      customer_name: customerInfo.name,
      customer_phone: customerInfo.phone,
      customer_address: customerInfo.address,
    });

    navigate('/');
  };

  const totalUSD = productPrice + shippingCost;
  const totalDZD = totalUSD * exchangeRate;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF6A00] via-[#FF4400] to-[#E60000] p-4">
      <div className="max-w-4xl mx-auto">
        <BackButton />
        
        <div className="text-center mb-8 mt-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShoppingCart className="w-12 h-12 text-white" />
            <h1 className="text-4xl font-bold text-white">AliExpress</h1>
          </div>
          <p className="text-white/90 text-lg">تسوق من AliExpress بكل سهولة</p>
        </div>

        {/* Step 1: URL Input */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">ضع رابط المنتج</CardTitle>
              <CardDescription>أدخل رابط المنتج من موقع AliExpress</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...urlForm}>
                <form onSubmit={urlForm.handleSubmit(onUrlSubmit)} className="space-y-4">
                  <FormField
                    control={urlForm.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رابط المنتج</FormLabel>
                        <FormControl>
                          <Input placeholder="https://www.aliexpress.com/item/..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full bg-[#FF4400] hover:bg-[#E60000]">
                    التالي <ArrowRight className="mr-2" />
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Product Images & Prices */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">تفاصيل المنتج</CardTitle>
              <CardDescription>تحقق من المنتج وأدخل الأسعار</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Product Images */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {productImages.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Product ${idx + 1}`}
                    className="w-full h-48 object-cover rounded-lg border-2 border-border"
                  />
                ))}
              </div>

              {/* Price Form */}
              <Form {...priceForm}>
                <form onSubmit={priceForm.handleSubmit(onPriceSubmit)} className="space-y-4">
                  <FormField
                    control={priceForm.control}
                    name="productPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          سعر المنتج الحقيقي (بالدولار)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={priceForm.control}
                    name="shippingCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          سعر الشحن إلى الجزائر (بالدولار)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">سعر الصرف:</span>
                      <span className="font-semibold">{exchangeRate} دج</span>
                    </div>
                    {priceForm.watch('productPrice') && priceForm.watch('shippingCost') && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">المجموع بالدولار:</span>
                          <span className="font-semibold">
                            ${(parseFloat(priceForm.watch('productPrice') || '0') + parseFloat(priceForm.watch('shippingCost') || '0')).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-lg">
                          <span className="font-bold">المجموع بالدينار:</span>
                          <span className="font-bold text-primary">
                            {((parseFloat(priceForm.watch('productPrice') || '0') + parseFloat(priceForm.watch('shippingCost') || '0')) * exchangeRate).toFixed(2)} دج
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                      رجوع
                    </Button>
                    <Button type="submit" className="flex-1 bg-[#FF4400] hover:bg-[#E60000]">
                      التالي <ArrowRight className="mr-2" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Customer Information */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">معلومات التوصيل</CardTitle>
              <CardDescription>أدخل معلوماتك الشخصية لإتمام الطلب</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...customerForm}>
                <form onSubmit={customerForm.handleSubmit(onCustomerInfoSubmit)} className="space-y-4">
                  <FormField
                    control={customerForm.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الاسم الكامل</FormLabel>
                        <FormControl>
                          <Input placeholder="أحمد محمد" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={customerForm.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الهاتف</FormLabel>
                        <FormControl>
                          <Input placeholder="0555123456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={customerForm.control}
                    name="customerAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>العنوان الكامل</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="العنوان، المدينة، الولاية..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                      رجوع
                    </Button>
                    <Button type="submit" className="flex-1 bg-[#FF4400] hover:bg-[#E60000]">
                      التالي <ArrowRight className="mr-2" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Payment Confirmation */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">تأكيد الدفع</CardTitle>
              <CardDescription>مراجعة الطلب والدفع</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Order Summary */}
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-lg mb-4">ملخص الطلب</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">سعر المنتج:</span>
                    <span>${productPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">سعر الشحن:</span>
                    <span>${shippingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>المجموع بالدولار:</span>
                    <span>${totalUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-primary pt-2 border-t">
                    <span>المجموع بالدينار:</span>
                    <span>{totalDZD.toFixed(2)} دج</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t space-y-2">
                  <h4 className="font-semibold">معلومات التوصيل:</h4>
                  <p className="text-sm text-muted-foreground">
                    <strong>الاسم:</strong> {customerInfo.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>الهاتف:</strong> {customerInfo.phone}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>العنوان:</strong> {customerInfo.address}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">رصيدك الحالي:</span>
                    <span className="font-semibold">{balance?.balance.toFixed(2)} دج</span>
                  </div>
                  <div className="flex justify-between items-center text-primary font-bold">
                    <span>الرصيد بعد الدفع:</span>
                    <span>{((balance?.balance || 0) - totalDZD).toFixed(2)} دج</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(3)} className="flex-1">
                  رجوع
                </Button>
                <Button 
                  onClick={handlePayment} 
                  disabled={isCreating || !balance || balance.balance < totalDZD}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isCreating ? 'جاري المعالجة...' : (
                    <>
                      <DollarSign className="ml-2" />
                      ادفع الآن
                    </>
                  )}
                </Button>
              </div>

              {balance && balance.balance < totalDZD && (
                <p className="text-destructive text-sm text-center">
                  رصيدك غير كافٍ. يرجى شحن حسابك أولاً.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AliExpress;
