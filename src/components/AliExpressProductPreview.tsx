import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Star, Package, TrendingDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductData {
  title: string;
  currentPrice: number | null;
  originalPrice: number | null;
  rating: number | null;
  reviewCount: number | null;
  images: string[] | null;
  discountPercent: string | null;
}

interface AliExpressProductPreviewProps {
  productData: ProductData;
  onClose: () => void;
  onConfirm: () => void;
}

export const AliExpressProductPreview = ({ productData, onClose, onConfirm }: AliExpressProductPreviewProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = productData.images || [];

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

          {/* Price */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 p-6">
            <div className="space-y-3">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-primary">
                  ${productData.currentPrice?.toFixed(2) || '0.00'}
                </span>
                {productData.originalPrice && productData.originalPrice > (productData.currentPrice || 0) && (
                  <span className="text-xl text-muted-foreground line-through">
                    ${productData.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>السعر قبل الرسوم والشحن</span>
              </div>
            </div>
          </Card>

          {/* Preview Note */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              📋 هذه معاينة للمنتج. بعد التأكيد، سيتم حساب السعر النهائي بالدينار الجزائري مع رسوم الخدمة والشحن.
            </p>
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