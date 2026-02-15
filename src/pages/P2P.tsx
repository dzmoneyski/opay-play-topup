import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Repeat2, Shield, TrendingUp, ShieldCheck, Zap, Clock, Users, Lock } from 'lucide-react';
import { P2PAdsList } from '@/components/p2p/P2PAdsList';
import { P2PMyOrders } from '@/components/p2p/P2PMyOrders';
import { P2PMyAds } from '@/components/p2p/P2PMyAds';
import { P2PCreateAd } from '@/components/p2p/P2PCreateAd';
import { useP2PAds } from '@/hooks/useP2P';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useBalance } from '@/hooks/useBalance';
import { motion } from 'framer-motion';

const P2P = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('buy');
  const { balance } = useBalance();
  const { ads: buyAds } = useP2PAds('buy');
  const { ads: sellAds } = useP2PAds('sell');
  const { isAdmin, loading: rolesLoading } = useUserRoles();

  // Show coming soon page for non-admin users
  if (!rolesLoading && !isAdmin) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <header className="bg-gradient-hero border-b border-border/50">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-gold">
                  <Repeat2 className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-primary-foreground">P2P</h1>
                  <p className="text-sm text-primary-foreground/70">تداول آمن بين المستخدمين</p>
                </div>
              </div>
            </div>
          </div>
        </header>
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
              <CardDescription className="text-base">نعمل على إطلاق منصة P2P قريباً</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Repeat2 className="h-5 w-5 text-primary" />
                  ماذا يعني P2P؟
                </h3>
                <p className="text-sm text-muted-foreground">
                  P2P (Peer-to-Peer) هي منصة تداول مباشرة بين المستخدمين تتيح لك شراء وبيع الرصيد بشكل آمن وسريع مع حماية كاملة لحقوق الطرفين.
                </p>
              </div>
              <div className="flex justify-center pt-4">
                <Badge variant="secondary" className="text-lg py-2 px-6">قريباً</Badge>
              </div>
              <Button onClick={() => navigate("/")} className="w-full mt-6" variant="outline">العودة للرئيسية</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const stats = [
    { icon: <Users className="h-4 w-4" />, label: 'إعلانات الشراء', value: buyAds.length },
    { icon: <TrendingUp className="h-4 w-4" />, label: 'إعلانات البيع', value: sellAds.length },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Hero Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-40 h-40 rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute bottom-0 left-10 w-60 h-60 rounded-full bg-primary-glow/30 blur-3xl" />
        </div>

        <div className="relative container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <motion.div 
                  className="p-2.5 rounded-xl bg-gradient-gold shadow-glow"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Repeat2 className="h-6 w-6 text-primary-foreground" />
                </motion.div>
                <div>
                  <h1 className="text-xl font-bold text-primary-foreground">P2P Trading</h1>
                  <p className="text-xs text-primary-foreground/60">تداول آمن بين المستخدمين</p>
                </div>
              </div>
            </div>
            
            {/* Balance */}
            <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-primary-foreground/20">
              <p className="text-[10px] text-primary-foreground/60">رصيدك</p>
              <p className="text-sm font-bold text-primary-foreground">
                {(balance?.balance || 0).toLocaleString()} د.ج
              </p>
            </div>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="relative container mx-auto px-4 pb-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: <ShieldCheck className="h-4 w-4" />, text: 'نظام ضمان' },
              { icon: <Zap className="h-4 w-4" />, text: 'فوري' },
              { icon: <Clock className="h-4 w-4" />, text: '30 دقيقة مهلة' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-center gap-1.5 bg-primary-foreground/10 backdrop-blur-sm rounded-lg py-2 text-primary-foreground/80 text-xs"
              >
                {item.icon}
                {item.text}
              </motion.div>
            ))}
          </div>
        </div>
      </header>

      {/* Stats bar */}
      <div className="container mx-auto px-4 py-3">
        <div className="flex gap-3">
          {stats.map((stat, i) => (
            <div key={i} className="flex-1 bg-card border border-border/50 rounded-xl p-3 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">{stat.icon}</div>
              <div>
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid grid-cols-4 w-full max-w-md">
              <TabsTrigger value="buy" className="text-xs">
                🟢 شراء
              </TabsTrigger>
              <TabsTrigger value="sell" className="text-xs">
                🔴 بيع
              </TabsTrigger>
              <TabsTrigger value="orders" className="text-xs">
                📋 طلباتي
              </TabsTrigger>
              <TabsTrigger value="ads" className="text-xs">
                📢 إعلاناتي
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Create ad button */}
          {(activeTab === 'buy' || activeTab === 'sell' || activeTab === 'ads') && (
            <div className="mb-4">
              <P2PCreateAd onCreated={() => setActiveTab('ads')} />
            </div>
          )}

          <TabsContent value="buy" className="mt-0">
            <div className="mb-3">
              <h2 className="font-semibold text-lg">إعلانات البيع</h2>
              <p className="text-xs text-muted-foreground">اشترِ رصيد المنصة من متداولين آخرين</p>
            </div>
            <P2PAdsList adType="sell" />
          </TabsContent>

          <TabsContent value="sell" className="mt-0">
            <div className="mb-3">
              <h2 className="font-semibold text-lg">إعلانات الشراء</h2>
              <p className="text-xs text-muted-foreground">بِع رصيدك مقابل أموال حقيقية</p>
            </div>
            <P2PAdsList adType="buy" />
          </TabsContent>

          <TabsContent value="orders" className="mt-0">
            <P2PMyOrders />
          </TabsContent>

          <TabsContent value="ads" className="mt-0">
            <P2PMyAds />
          </TabsContent>
        </Tabs>

        {/* How it works */}
        <div className="mt-8 bg-card border border-border/50 rounded-2xl p-5">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            كيف يعمل نظام P2P؟
          </h3>
          <div className="space-y-4">
            {[
              { step: '1', title: 'اختر إعلان', desc: 'تصفح إعلانات الشراء أو البيع واختر العرض المناسب' },
              { step: '2', title: 'يُحجز المبلغ', desc: 'يتم حجز رصيد البائع في نظام الضمان (Escrow) تلقائياً' },
              { step: '3', title: 'ادفع وأكّد', desc: 'المشتري يدفع عبر طريقة الدفع المتفق عليها ويؤكد' },
              { step: '4', title: 'يُحرر الرصيد', desc: 'بعد تأكيد البائع للاستلام، يُحرر الرصيد للمشتري' },
            ].map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default P2P;
