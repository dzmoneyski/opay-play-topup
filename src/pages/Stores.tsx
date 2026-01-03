import { useState } from "react";
import { Phone, MapPin, Store, Navigation, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import BackButton from "@/components/BackButton";
import { useStores, ALGERIA_WILAYAS } from "@/hooks/useStores";

const Stores = () => {
  const { stores, loading, selectedWilaya, setSelectedWilaya } = useStores();
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  const companyWhatsApp = "+213553980661";
  const whatsappMessage = encodeURIComponent("مرحباً، أريد معرفة أقرب متجر إلي");
  const whatsappUrl = `https://wa.me/${companyWhatsApp}?text=${whatsappMessage}`;

  const openInMaps = (store: typeof stores[0]) => {
    // إذا كان هناك رابط خريطة مباشر، استخدمه
    if (store.map_url) {
      window.open(store.map_url, '_blank');
      return;
    }
    // وإلا ابحث عن العنوان في Google Maps
    const address = [store.street_address, store.city, store.wilaya]
      .filter(Boolean)
      .join(', ');
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', الجزائر')}`;
    window.open(mapsUrl, '_blank');
  };

  const callStore = (store: typeof stores[0]) => {
    // استخدم رقم المتجر إذا وجد، وإلا رقم التاجر
    const phone = store.store_phone || store.phone;
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <BackButton />
        
        <div className="mt-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Store className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">المتاجر المعتمدة</h1>
            <p className="text-muted-foreground">
              اختر ولايتك لعرض المتاجر القريبة منك
            </p>
          </div>

          {/* Wilaya Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">اختر الولاية</label>
                <Select value={selectedWilaya} onValueChange={setSelectedWilaya}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="جميع الولايات" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">جميع الولايات</SelectItem>
                    {ALGERIA_WILAYAS.map((wilaya) => (
                      <SelectItem key={wilaya.code} value={wilaya.name}>
                        {wilaya.code} - {wilaya.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Stores List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : stores.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                تم العثور على {stores.length} متجر
              </p>
              {stores.map((store) => (
                <Card key={store.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                  {/* Store Image */}
                  {store.store_image && (
                    <div 
                      className="w-full h-40 overflow-hidden cursor-pointer"
                      onClick={() => setSelectedImage({ url: store.store_image!, name: store.business_name })}
                    >
                      <img 
                        src={store.store_image} 
                        alt={store.business_name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Store Info */}
                      <div>
                        <h3 className="text-lg font-bold text-foreground">
                          {store.business_name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {[store.wilaya, store.city, store.street_address]
                              .filter(Boolean)
                              .join(' - ')}
                          </span>
                        </div>
                        {(store.store_phone || store.phone) && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Phone className="w-4 h-4" />
                            <span dir="ltr">{store.store_phone || store.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => callStore(store)}
                        >
                          <Phone className="w-4 h-4" />
                          اتصال
                        </Button>
                        <Button
                          className="flex-1 gap-2 bg-primary"
                          onClick={() => openInMaps(store)}
                        >
                          <Navigation className="w-4 h-4" />
                          الموقع
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-2 border-dashed">
              <CardHeader className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mx-auto">
                  <Store className="w-8 h-8 text-muted-foreground" />
                </div>
                <CardTitle>لا توجد متاجر</CardTitle>
                <CardDescription>
                  {selectedWilaya === 'all' 
                    ? 'لم يتم إضافة متاجر بعد. تواصل معنا عبر الواتساب'
                    : `لا توجد متاجر في ${selectedWilaya}. جرب ولاية أخرى`}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* WhatsApp Contact */}
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">لم تجد متجراً قريباً؟</h4>
                  <p className="text-sm text-muted-foreground">تواصل معنا لمساعدتك</p>
                </div>
                <Button
                  size="sm"
                  className="bg-green-500 hover:bg-green-600"
                  onClick={() => window.open(whatsappUrl, '_blank')}
                >
                  واتساب
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/95 border-none">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-2 right-2 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          {selectedImage && (
            <div className="w-full flex flex-col items-center">
              <img 
                src={selectedImage.url} 
                alt={selectedImage.name}
                className="w-full max-h-[80vh] object-contain"
              />
              <p className="text-white text-center py-3 font-medium">
                {selectedImage.name}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Stores;
