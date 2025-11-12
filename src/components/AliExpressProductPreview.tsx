import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, ShoppingCart, TrendingUp, DollarSign, Check } from 'lucide-react';

interface ProductData {
  title: string;
  price: number;
  originalPrice: number | null;
  images: string[];
  rating: number;
  orders: string;
  description: string;
  shippingCost: number | null;
}

interface AliExpressProductPreviewProps {
  productData: ProductData;
  exchangeRate: number;
  serviceFeePercentage: number;
  defaultShippingFee: number;
}

const AliExpressProductPreview: React.FC<AliExpressProductPreviewProps> = ({
  productData,
  exchangeRate,
  serviceFeePercentage,
  defaultShippingFee,
}) => {
  const productPrice = productData.price || 0;
  const shippingCost = productData.shippingCost !== null ? productData.shippingCost : defaultShippingFee;
  
  // حساب التكاليف
  const totalUSD = productPrice + shippingCost;
  const totalDZD = totalUSD * exchangeRate;
  const serviceFee = totalDZD * (serviceFeePercentage / 100);
  const finalTotal = totalDZD + serviceFee;

  const productPriceDZD = productPrice * exchangeRate;
  const shippingCostDZD = shippingCost * exchangeRate;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* معرض الصور */}
        {productData.images && productData.images.length > 0 && (
          <div className="relative h-64 md:h-96 bg-muted">
            <img
              src={productData.images[0]}
              alt={productData.title}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg';
              }}
            />
            {productData.originalPrice && productData.originalPrice > productData.price && (
              <Badge className="absolute top-4 right-4 bg-destructive text-destructive-foreground">
                خصم {Math.round((1 - productPrice / productData.originalPrice) * 100)}%
              </Badge>
            )}
          </div>
        )}

        {/* معلومات المنتج */}
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-right mb-2">{productData.title}</h3>
            
            {/* التقييم والطلبات */}
            <div className="flex items-center gap-4 justify-end flex-wrap">
              {productData.rating > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold">{productData.rating.toFixed(1)}</span>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
              )}
              {productData.orders && productData.orders !== '0' && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span className="text-sm">{productData.orders} طلب</span>
                  <TrendingUp className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>

          {productData.description && (
            <p className="text-sm text-muted-foreground text-right line-clamp-3">
              {productData.description}
            </p>
          )}

          {/* تفاصيل الأسعار */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-right flex items-center justify-end gap-2">
              <DollarSign className="h-5 w-5" />
              تفاصيل السعر
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <div className="space-x-2 space-x-reverse">
                  <span className="font-semibold">{productPriceDZD.toFixed(2)} DZD</span>
                  <span className="text-muted-foreground">({productPrice.toFixed(2)} USD)</span>
                </div>
                <span className="text-muted-foreground">سعر المنتج</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="space-x-2 space-x-reverse">
                  <span className="font-semibold">{shippingCostDZD.toFixed(2)} DZD</span>
                  <span className="text-muted-foreground">({shippingCost.toFixed(2)} USD)</span>
                  {productData.shippingCost !== null && (
                    <Check className="inline h-4 w-4 text-green-500" />
                  )}
                </div>
                <span className="text-muted-foreground">
                  رسوم الشحن {productData.shippingCost !== null ? '(سعر حقيقي)' : '(تقدير)'}
                </span>
              </div>

              <div className="flex justify-between items-center text-primary">
                <span className="font-semibold">
                  {serviceFee.toFixed(2)} DZD
                </span>
                <span>عمولة الخدمة ({serviceFeePercentage}%)</span>
              </div>

              <div className="border-t border-border pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <div className="space-x-2 space-x-reverse">
                    <span className="text-2xl font-bold text-primary">
                      {finalTotal.toFixed(2)} DZD
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({totalUSD.toFixed(2)} USD)
                    </span>
                  </div>
                  <span className="text-lg font-bold">المجموع الكلي</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
              سعر الصرف: 1 USD = {exchangeRate} DZD
            </div>
          </div>

          {/* صور إضافية */}
          {productData.images && productData.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {productData.images.slice(1, 5).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`${productData.title} - ${idx + 2}`}
                  className="w-full h-20 object-contain rounded border border-border"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AliExpressProductPreview;
