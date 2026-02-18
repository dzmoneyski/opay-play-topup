import { Shield, CheckCircle, MapPin, Phone, Mail, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BackButton from "@/components/BackButton";
import commercialRegister1 from "@/assets/commercial-register-1.jpg";
import commercialRegister2 from "@/assets/commercial-register-2.jpg";

const AboutUs = () => {
  const companyInfo = {
    nif: "19621230011114402100",
    telegram: "https://t.me/opay_admin",
    website: "https://opaydz.com",
    commercialRegister: "19621230011114402100",
    email: "opaydz.officel@gmail.com",
    whatsapp: "https://wa.me/213660873714",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5" dir="rtl">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <BackButton />
        
        <div className="mt-6 space-y-6">
          {/* Hero Section */}
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 mb-4 shadow-glow animate-pulse-glow">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              من نحن؟
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              منصة جزائرية رسمية مسجلة ومعتمدة للخدمات المالية الرقمية
            </p>
          </div>

          {/* Company Status Card */}
          <Card className="border-2 border-primary/20 shadow-elevated bg-gradient-to-br from-card to-card/80">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <Badge variant="secondary" className="text-base px-4 py-1.5 bg-green-500/10 text-green-500 border border-green-500/20">
                  مسجل رسمياً
                </Badge>
              </div>
              <CardTitle className="text-2xl">OPay DZ - منصة الدفع الرقمية</CardTitle>
              <CardDescription className="text-base mt-2">
                نعمل بشكل قانوني ومسجلين لدى الجهات الجزائرية المختصة
              </CardDescription>
            </CardHeader>
          </Card>

          {/* What We Do */}
          <Card className="shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Shield className="w-5 h-5 text-primary" />
                ماذا نقدم؟
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">شحن رصيدك بسهولة</p>
                  <p className="text-sm text-muted-foreground">عبر BaridiMob وطرق دفع متعددة</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">شراء البطاقات الرقمية</p>
                  <p className="text-sm text-muted-foreground">Google Play، UC PUBG، بايبال، ريدوت باي وغيرها</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">التحويلات الآمنة</p>
                  <p className="text-sm text-muted-foreground">إرسال واستقبال الأموال بين المستخدمين</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal Information */}
          <Card className="shadow-elevated border-2 border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="w-5 h-5 text-primary" />
                المعلومات القانونية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">نوع النشاط:</span>
                  <Badge variant="outline" className="text-base px-3 py-1">تجارة إلكترونية</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">رقم NIF:</span>
                  <span className="font-mono font-bold text-primary direction-ltr">{companyInfo.nif}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">رقم السجل التجاري:</span>
                  <span className="font-mono font-bold text-primary direction-ltr">{companyInfo.commercialRegister}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commercial Register Images */}
          <Card className="shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="w-5 h-5 text-primary" />
                السجل التجاري الرسمي
              </CardTitle>
              <CardDescription>
                نسخة من سجلنا التجاري كدليل على مصداقيتنا
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="relative group overflow-hidden rounded-xl border-2 border-primary/20 hover:border-primary/40 transition-all">
                  <img 
                    src={commercialRegister1} 
                    alt="السجل التجاري - صفحة 1" 
                    className="w-full h-auto object-contain bg-muted/30"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="relative group overflow-hidden rounded-xl border-2 border-primary/20 hover:border-primary/40 transition-all">
                  <img 
                    src={commercialRegister2} 
                    alt="السجل التجاري - صفحة 2" 
                    className="w-full h-auto object-contain bg-muted/30"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="shadow-elevated bg-gradient-to-br from-card to-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Phone className="w-5 h-5 text-primary" />
                تواصل معنا
              </CardTitle>
              <CardDescription>
                للاستفسارات والدعم الفني
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <a 
                href={companyInfo.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="flex items-center justify-between p-4 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/20 rounded-xl transition-all group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0088cc] flex items-center justify-center">
                      <ExternalLink className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">تيليغرام</p>
                      <p className="text-xs text-muted-foreground direction-ltr">@opay_admin</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-[#0088cc] transition-colors" />
                </div>
              </a>

              <a 
                href={`https://wa.me/213660873714`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="flex items-center justify-between p-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-xl transition-all group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">واتساب</p>
                      <p className="text-xs text-muted-foreground direction-ltr">+213 660 873 714</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-green-500 transition-colors" />
                </div>
              </a>

              <a 
                href={`mailto:${companyInfo.email}`}
                className="block"
              >
                <div className="flex items-center justify-between p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">البريد الإلكتروني</p>
                      <p className="text-xs text-muted-foreground direction-ltr">{companyInfo.email}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-red-500 transition-colors" />
                </div>
              </a>

              <a 
                href={companyInfo.website}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="flex items-center justify-between p-4 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl transition-all group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                      <ExternalLink className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">موقعنا الرسمي</p>
                      <p className="text-xs text-muted-foreground direction-ltr">{companyInfo.website}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </a>
            </CardContent>
          </Card>

          {/* Trust Message */}
          <Card className="shadow-elevated border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-6 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">مع OPay DZ</h3>
              <p className="text-lg text-muted-foreground">
                خدماتنا آمنة، موثوقة، جزائرية <span className="text-primary font-bold">100%</span>
              </p>
              <div className="pt-4">
                <p className="text-sm text-muted-foreground">
                  هل عندك شك؟ نحن هنا للإجابة على أي استفسار
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
