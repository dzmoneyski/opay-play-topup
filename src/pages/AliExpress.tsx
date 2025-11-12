import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Link as LinkIcon, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import BackButton from '@/components/BackButton';
import AliExpressProductPreview from '@/components/AliExpressProductPreview';
import { useAliExpressSettings } from '@/hooks/useAliExpressSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AliExpress = () => {
  const navigate = useNavigate();
  const [productUrl, setProductUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [productData, setProductData] = useState<any>(null);
  
  const { settings } = useAliExpressSettings();

  const handleLoadProduct = async () => {
    if (!productUrl.includes('aliexpress.com')) {
      toast.error('الرجاء إدخال رابط صحيح من AliExpress');
      return;
    }

    setLoading(true);
    setProductData(null);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-aliexpress', {
        body: { url: productUrl }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setProductData(data);
      toast.success('تم تحميل بيانات المنتج بنجاح');
    } catch (error: any) {
      console.error('Error loading product:', error);
      toast.error('فشل تحميل بيانات المنتج. الرجاء المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = () => {
    if (!productData || !productData.price) {
      toast.error('الرجاء تحميل المنتج أولاً');
      return;
    }

    const productPrice = productData.price || 0;
    const shippingCost = productData.shippingCost !== null ? productData.shippingCost : settings.defaultShippingFee;
    const totalUSD = productPrice + shippingCost;
    const totalDZD = totalUSD * settings.exchangeRate;
    const serviceFee = totalDZD * (settings.serviceFeePercentage / 100);
    const finalTotal = totalDZD + serviceFee;

    navigate('/deposits', {
      state: {
        amount: finalTotal,
        description: `طلب منتج AliExpress - ${productData.title}`,
        productUrl: productUrl
      }
    });
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

      <div className="container mx-auto px-4 max-w-4xl space-y-6">
        {/* إدخال رابط المنتج */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              رابط المنتج
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-url">الصق رابط المنتج من AliExpress</Label>
              <Input
                id="product-url"
                type="url"
                placeholder="https://www.aliexpress.com/item/..."
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                className="text-right"
              />
            </div>
            <Button 
              onClick={handleLoadProduct}
              disabled={!productUrl || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري التحميل...
                </>
              ) : (
                'عرض المنتج'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* عرض المنتج */}
        {productData && (
          <AliExpressProductPreview
            productData={productData}
            exchangeRate={settings.exchangeRate}
            serviceFeePercentage={settings.serviceFeePercentage}
            defaultShippingFee={settings.defaultShippingFee}
          />
        )}

        {/* زر الدفع */}
        {productData && (
          <Button
            onClick={handlePayNow}
            className="w-full h-12 text-lg"
            size="lg"
          >
            ادفع الآن
            <ArrowRight className="mr-2 h-5 w-5" />
          </Button>
        )}

        {/* معلومات إضافية */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-primary">📌 ملاحظات هامة:</p>
              <ul className="space-y-1 text-muted-foreground mr-4">
                <li>• يرجى التأكد من صحة رابط المنتج قبل المتابعة</li>
                <li>• أدخل السعر بالدولار كما يظهر في صفحة المنتج</li>
                <li>• العمولة 5% تشمل تكاليف التحويل والمعالجة</li>
                <li>• سيتم تحويلك لصفحة الدفع لإتمام العملية</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AliExpress;
