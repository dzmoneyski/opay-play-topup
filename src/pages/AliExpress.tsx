import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRight, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import BackButton from '@/components/BackButton';
import { useAliExpressSettings } from '@/hooks/useAliExpressSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formSchema = z.object({
  productUrl: z.string().url('الرجاء إدخال رابط صحيح').refine(
    (url) => url.includes('aliexpress.com'),
    'الرابط يجب أن يكون من AliExpress'
  ),
  price: z.string().min(1, 'الرجاء إدخال السعر').refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    'السعر يجب أن يكون رقماً موجباً'
  ),
  shippingCost: z.string().min(1, 'الرجاء إدخال رسوم الشحن').refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0,
    'رسوم الشحن يجب أن تكون رقماً موجباً أو صفر'
  ),
});

const AliExpress = () => {
  const navigate = useNavigate();
  const { settings } = useAliExpressSettings();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productUrl: '',
      price: '',
      shippingCost: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const productPrice = Number(values.price);
    const shippingCost = Number(values.shippingCost);
    const totalUSD = productPrice + shippingCost;
    const totalDZD = totalUSD * settings.exchangeRate;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('يجب تسجيل الدخول أولاً');
        navigate('/auth');
        return;
      }

      const { error } = await supabase
        .from('aliexpress_orders')
        .insert({
          user_id: user.id,
          product_url: values.productUrl,
          product_title: 'طلب من AliExpress',
          product_image: null,
          price_usd: productPrice,
          shipping_cost_usd: shippingCost,
          total_usd: totalUSD,
          exchange_rate: settings.exchangeRate,
          total_dzd: totalDZD,
          service_fee_percentage: 0,
          service_fee_dzd: 0,
          final_total_dzd: totalDZD,
        });

      if (error) throw error;

      toast.success('تم إنشاء الطلب بنجاح! سيتم مراجعة طلبك والتواصل معك قريباً');

      navigate('/deposits', {
        state: {
          amount: totalDZD,
          description: `طلب منتج AliExpress`,
          productUrl: values.productUrl
        }
      });
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error('فشل إنشاء الطلب. الرجاء المحاولة مرة أخرى');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-hero text-white p-6 rounded-b-3xl shadow-xl mb-6">
        <BackButton />
        <div className="text-center mt-4">
          <h1 className="text-3xl font-bold mb-2">AliExpress</h1>
          <p className="text-white/90">تسوق وادفع بالدينار الجزائري</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              معلومات المنتج
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="productUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رابط المنتج من AliExpress</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://www.aliexpress.com/item/..."
                          {...field}
                          className="text-right"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>سعر المنتج (بالدولار USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          className="text-right"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shippingCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رسوم الشحن (بالدولار USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          className="text-right"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">ملخص السعر:</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>سعر الصرف:</span>
                      <span className="font-medium">{settings.exchangeRate} DZD/USD</span>
                    </div>
                    {form.watch('price') && form.watch('shippingCost') && (
                      <>
                        <div className="flex justify-between">
                          <span>المجموع بالدولار:</span>
                          <span className="font-medium">
                            ${(Number(form.watch('price')) + Number(form.watch('shippingCost'))).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-base font-bold text-primary pt-2 border-t">
                          <span>المجموع النهائي:</span>
                          <span>
                            {((Number(form.watch('price')) + Number(form.watch('shippingCost'))) * settings.exchangeRate).toFixed(2)} DZD
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 text-lg" size="lg">
                  إنشاء الطلب والدفع
                  <ArrowRight className="mr-2 h-5 w-5" />
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-primary">📌 تعليمات:</p>
              <ul className="space-y-1 text-muted-foreground mr-4">
                <li>• انسخ رابط المنتج من AliExpress والصقه في الحقل الأول</li>
                <li>• أدخل سعر المنتج كما يظهر في الصفحة (بالدولار)</li>
                <li>• أدخل تكلفة الشحن إلى الجزائر (بالدولار)</li>
                <li>• سيتم تحويلك لصفحة الدفع بعد إنشاء الطلب</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AliExpress;
