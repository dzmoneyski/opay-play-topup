import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, DollarSign, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import BackButton from '@/components/BackButton';

const AliExpress = () => {
  const navigate = useNavigate();
  const [productUrl, setProductUrl] = useState('');
  const [priceUSD, setPriceUSD] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // ثوابت الحساب
  const EXCHANGE_RATE = 250; // 1 USD = 250 DZD
  const COMMISSION = 0.05; // 5%

  // حساب السعر بالدينار
  const calculatePriceDZD = () => {
    const usdAmount = parseFloat(priceUSD) || 0;
    const dzdAmount = usdAmount * EXCHANGE_RATE;
    const commission = dzdAmount * COMMISSION;
    return {
      basePrice: dzdAmount,
      commission: commission,
      total: dzdAmount + commission
    };
  };

  const prices = calculatePriceDZD();

  const handleLoadProduct = () => {
    if (productUrl.includes('aliexpress.com')) {
      setShowPreview(true);
    }
  };

  const handlePayNow = () => {
    if (priceUSD && parseFloat(priceUSD) > 0) {
      // التحويل إلى صفحة الدفع مع البيانات
      navigate('/deposits', {
        state: {
          amount: prices.total,
          description: `طلب منتج AliExpress - ${priceUSD} USD`,
          productUrl: productUrl
        }
      });
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
              disabled={!productUrl}
              className="w-full"
            >
              عرض المنتج
            </Button>
          </CardContent>
        </Card>

        {/* عرض المنتج */}
        {showPreview && productUrl && (
          <Card>
            <CardHeader>
              <CardTitle>معاينة المنتج</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[500px] border border-border rounded-lg overflow-hidden">
                <iframe
                  src={productUrl}
                  className="w-full h-full"
                  title="AliExpress Product"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* إدخال السعر */}
        {showPreview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                السعر والدفع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="price-usd">سعر المنتج بالدولار (USD)</Label>
                <Input
                  id="price-usd"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={priceUSD}
                  onChange={(e) => setPriceUSD(e.target.value)}
                  className="text-right text-lg font-semibold"
                />
              </div>

              {priceUSD && parseFloat(priceUSD) > 0 && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">السعر الأساسي</span>
                    <span className="font-semibold">
                      {prices.basePrice.toFixed(2)} DZD
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">العمولة (5%)</span>
                    <span className="font-semibold text-primary">
                      + {prices.commission.toFixed(2)} DZD
                    </span>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">المجموع الكلي</span>
                      <span className="text-2xl font-bold text-primary">
                        {prices.total.toFixed(2)} DZD
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground text-center">
                    سعر الصرف: 1 USD = {EXCHANGE_RATE} DZD
                  </div>
                </div>
              )}

              <Button
                onClick={handlePayNow}
                disabled={!priceUSD || parseFloat(priceUSD) <= 0}
                className="w-full h-12 text-lg"
                size="lg"
              >
                ادفع الآن
                <ArrowRight className="mr-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
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
