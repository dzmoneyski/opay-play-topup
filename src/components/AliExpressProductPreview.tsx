import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Star, Package, TrendingDown, X, DollarSign, TrendingUp, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductData {
  title: string;
  currentPrice: number | null;
  originalPrice: number | null;
  rating: number | null;
  reviewCount: number | null;
  images: string[] | null;
  discountPercent: string | null;
  shippingCost: number | null;
}

interface ExchangeRate {
  rate: number;
}

interface Fees {
  service_fee_percentage: number;
  min_service_fee: number;
  default_shipping_fee: number;
}

interface AliExpressProductPreviewProps {
  productData: ProductData;
  exchangeRate: ExchangeRate;
  fees: Fees;
  quantity?: number;
  onClose: () => void;
  onConfirm: () => void;
}

export const AliExpressProductPreview = ({ 
  productData, 
  exchangeRate, 
  fees, 
  quantity = 1,
  onClose, 
  onConfirm 
}: AliExpressProductPreviewProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = productData.images || [];

  // Calculate all prices
  const calculatePrices = () => {
    if (!productData.currentPrice) {
      return { 
        priceUSD: 0, 
        priceDZD: 0, 
        serviceFeeUSD: 0, 
        servicFeeDZD: 0,
        shippingFeeUSD: 0,
        shippingFeeDZD: 0,
        actualShippingFromSite: false,
        totalUSD: 0, 
        totalDZD: 0 
      };
    }

    const priceUSD = productData.currentPrice * quantity;
    const priceDZD = priceUSD * exchangeRate.rate;
    
    let servicFeeDZD = (priceDZD * fees.service_fee_percentage) / 100;
    if (servicFeeDZD < fees.min_service_fee) {
      servicFeeDZD = fees.min_service_fee;
    }
    const serviceFeeUSD = servicFeeDZD / exchangeRate.rate;
    
    // Use actual shipping from AliExpress if available, otherwise use default
    let shippingFeeUSD = 0;
    let shippingFeeDZD = 0;
    let actualShippingFromSite = false;
    
    if (productData.shippingCost !== null && productData.shippingCost !== undefined) {
      // Use actual shipping cost from AliExpress
      shippingFeeUSD = productData.shippingCost;
      shippingFeeDZD = shippingFeeUSD * exchangeRate.rate;
      actualShippingFromSite = true;
    } else {
      // Fallback to default shipping fee
      shippingFeeDZD = fees.default_shipping_fee;
      shippingFeeUSD = shippingFeeDZD / exchangeRate.rate;
    }
    
    const totalDZD = priceDZD + servicFeeDZD + shippingFeeDZD;
    const totalUSD = totalDZD / exchangeRate.rate;

    return { 
      priceUSD, 
      priceDZD, 
      serviceFeeUSD, 
      servicFeeDZD,
      shippingFeeUSD,
      shippingFeeDZD,
      actualShippingFromSite,
      totalUSD, 
      totalDZD 
    };
  };

  const prices = calculatePrices();

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-4 flex justify-between items-center z-10">
          <h3 className="text-lg font-semibold">معاينة المنتج</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Image Carousel */}
          {images.length > 0 && (
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
              <img
                src={images[currentImageIndex]}
                alt={productData.title}
                className="w-full h-full object-contain"
                loading="lazy"
              />
              
              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  
                  {/* Image indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, index) => (
                      <div
                        key={index}
                        className={`h-2 rounded-full transition-all ${
                          index === currentImageIndex 
                            ? 'w-6 bg-primary' 
                            : 'w-2 bg-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Discount Badge */}
              {productData.discountPercent && (
                <Badge className="absolute top-4 right-4 bg-red-500 text-white text-lg px-3 py-1">
                  <TrendingDown className="h-4 w-4 ml-1" />
                  {productData.discountPercent}% خصم
                </Badge>
              )}
            </div>
          )}

          {/* Product Title */}
          <div>
            <h2 className="text-xl font-bold text-foreground leading-relaxed">
              {productData.title}
            </h2>
          </div>

          {/* Rating */}
          {productData.rating && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/20 px-3 py-1.5 rounded-full">
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {productData.rating.toFixed(1)}
                </span>
                <Star className="h-4 w-4 fill-orange-500 text-orange-500" />
              </div>
              {productData.reviewCount && (
                <span className="text-sm text-muted-foreground">
                  ({productData.reviewCount.toLocaleString('ar-DZ')} تقييم)
                </span>
              )}
            </div>
          )}

          {/* Professional Price Breakdown */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
              <h3 className="text-white font-bold text-xl flex items-center gap-2">
                <DollarSign className="h-6 w-6" />
                تفاصيل التكلفة الكاملة
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Product Price */}
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">سعر المنتج</p>
                    {quantity > 1 && (
                      <p className="text-xs text-muted-foreground">الكمية: {quantity}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ${prices.priceUSD.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground font-semibold">
                    {prices.priceDZD.toFixed(2)} دج
                  </p>
                </div>
              </div>

              {/* Service Fee */}
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">رسوم الخدمة</p>
                    <p className="text-xs text-muted-foreground">{fees.service_fee_percentage}% من السعر</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    ${prices.serviceFeeUSD.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground font-semibold">
                    {prices.servicFeeDZD.toFixed(2)} دج
                  </p>
                </div>
              </div>

              {/* Shipping Fee */}
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">رسوم الشحن الدولي</p>
                    {prices.actualShippingFromSite ? (
                      <p className="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        سعر حقيقي من AliExpress
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">تقدير أولي</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    ${prices.shippingFeeUSD.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground font-semibold">
                    {prices.shippingFeeDZD.toFixed(2)} دج
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-dashed border-gray-300 dark:border-gray-600"></div>
                </div>
              </div>

              {/* Total */}
              <div className="p-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <DollarSign className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="text-white/80 text-sm font-medium">المجموع الإجمالي</p>
                      <p className="text-white text-xl font-black">Total Amount</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-white drop-shadow-lg">
                      ${prices.totalUSD.toFixed(2)}
                    </p>
                    <p className="text-2xl text-white/90 font-bold mt-1">
                      {prices.totalDZD.toFixed(2)} دج
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Exchange Rate Info */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-amber-900 dark:text-amber-100">
                <span className="font-bold">سعر الصرف المستخدم:</span> 1 USD = {exchangeRate.rate} DZD
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={onConfirm}
              className="flex-1 h-12 text-lg"
              size="lg"
            >
              تأكيد واستكمال الطلب
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="h-12"
              size="lg"
            >
              إلغاء
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};