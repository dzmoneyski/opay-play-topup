import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Repeat2, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const P2P = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-hero border-b border-border/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-gold">
                <Repeat2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">P2P</h1>
                <p className="text-sm text-white/70">تداول آمن بين المستخدمين</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-card border-0 bg-gradient-card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-gold opacity-5"></div>
          <CardHeader className="text-center relative z-10">
            <div className="flex justify-center mb-4">
              <div className="p-6 rounded-full bg-gradient-gold/20">
                <Lock className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl mb-2">الخدمة قيد التطوير</CardTitle>
            <CardDescription className="text-base">
              نعمل على إطلاق منصة P2P قريباً
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Repeat2 className="h-5 w-5 text-primary" />
                  ماذا يعني P2P؟
                </h3>
                <p className="text-sm text-muted-foreground">
                  P2P (Peer-to-Peer) هي منصة تداول مباشرة بين المستخدمين تتيح لك شراء وبيع العملات الرقمية والأموال بشكل آمن وسريع مع حماية كاملة لحقوق الطرفين.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">المميزات القادمة:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground pr-4">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>تداول مباشر مع مستخدمين موثوقين</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>نظام حماية متقدم (Escrow)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>تقييمات المستخدمين والمراجعات</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>دعم طرق دفع متعددة</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>رسوم منخفضة وتنافسية</span>
                  </li>
                </ul>
              </div>

              <div className="flex justify-center pt-4">
                <Badge variant="secondary" className="text-lg py-2 px-6">
                  قريباً
                </Badge>
              </div>

              <Button
                onClick={() => navigate("/")}
                className="w-full mt-6"
                variant="outline"
              >
                العودة للرئيسية
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default P2P;
