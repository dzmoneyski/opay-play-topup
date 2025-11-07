import { Phone, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BackButton from "@/components/BackButton";

const Stores = () => {
  const companyWhatsApp = "+213553980661";
  const whatsappMessage = encodeURIComponent("مرحباً، أريد معرفة أقرب متجر إلي");
  const whatsappUrl = `https://wa.me/${companyWhatsApp}?text=${whatsappMessage}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <BackButton />
        
        <div className="mt-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">المتاجر القريبة</h1>
            <p className="text-muted-foreground">
              نساعدك في العثور على أقرب متجر إليك
            </p>
          </div>

          {/* Main Card */}
          <Card className="border-2">
            <CardHeader className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mx-auto">
                <MessageCircle className="w-10 h-10 text-green-500" />
              </div>
              <CardTitle className="text-2xl">تواصل معنا عبر الواتساب</CardTitle>
              <CardDescription className="text-base">
                للعثور على أقرب متجر إليك، تواصل مع فريق الدعم عبر الواتساب
                <br />
                وسنقوم بتوجيهك إلى أقرب نقطة بيع
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* WhatsApp Number */}
              <div className="flex items-center justify-center gap-3 p-4 bg-muted rounded-lg">
                <Phone className="w-5 h-5 text-primary" />
                <span className="text-xl font-semibold direction-ltr">
                  {companyWhatsApp}
                </span>
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => window.open(whatsappUrl, '_blank')}
                size="lg"
                className="w-full gap-2 bg-green-500 hover:bg-green-600 text-white"
              >
                <MessageCircle className="w-5 h-5" />
                فتح الواتساب
              </Button>

              {/* Info Box */}
              <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  كيف يعمل هذا؟
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1 mr-6">
                  <li>• اضغط على زر "فتح الواتساب"</li>
                  <li>• أرسل موقعك أو مدينتك</li>
                  <li>• سنرشدك إلى أقرب متجر معتمد</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <div className="text-center text-sm text-muted-foreground">
            <p>متوفرون على مدار الساعة لخدمتك</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stores;
