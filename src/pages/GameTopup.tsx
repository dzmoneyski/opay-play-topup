import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Gamepad2, AlertCircle, Loader2, Wallet, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGamePlatforms, useGamePackages, useCreateGameTopupOrder, useGameTopupOrders } from "@/hooks/useGamePlatforms";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BettingForm } from "@/components/BettingForm";
import { useBalance } from "@/hooks/useBalance";
import { getPlatformLogo } from "@/lib/gamePlatformLogos";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const GameTopup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'games' | 'betting' | 'orders'>('games');
  const [showUnderReviewDialog, setShowUnderReviewDialog] = useState(false);
  
  const { data: platforms, isLoading: platformsLoading } = useGamePlatforms();
  const { data: packages, isLoading: packagesLoading } = useGamePackages(selectedPlatform);
  const createOrder = useCreateGameTopupOrder();
  const { balance, loading: balanceLoading, fetchBalance } = useBalance();
  const { data: orders, isLoading: ordersLoading } = useGameTopupOrders();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlatform || !playerId || !selectedPackage) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول",
        variant: "destructive",
      });
      return;
    }

    const selectedPkg = packages?.find(p => p.id === selectedPackage);
    if (!selectedPkg) return;

    createOrder.mutate(
      {
        platform_id: selectedPlatform,
        package_id: selectedPackage,
        player_id: playerId,
        amount: selectedPkg.price,
      },
      {
        onSuccess: () => {
          navigate("/");
        },
      }
    );
  };

  const gamePlatforms = platforms?.filter(p => p.category === 'game') || [];
  const bettingPlatforms = platforms?.filter(p => p.category === 'betting') || [];

  const getSelectedPackagePrice = () => {
    const pkg = packages?.find(p => p.id === selectedPackage);
    return pkg?.price || 0;
  };

  const handlePlatformSelect = (platformId: string, category: 'game' | 'betting') => {
    // Show dialog for betting platforms instead of selecting them
    if (category === 'betting') {
      setShowUnderReviewDialog(true);
      return;
    }
    
    setSelectedPlatform(platformId);
    setSelectedPackage(null);
    setPlayerId("");
    setCurrentTab('games');
  };

  const selectedPlatformData = platforms?.find(p => p.id === selectedPlatform);

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
              <div className="p-2 rounded-xl bg-gradient-primary">
                <Gamepad2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">شحن الألعاب</h1>
                <p className="text-sm text-white/70">اشحن حسابك بسرعة وأمان</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Balance Card */}
        <Card className="mb-6 bg-gradient-card border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-primary">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الرصيد المتاح</p>
                  {balanceLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">جاري التحميل...</span>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold">{Math.floor(balance?.balance || 0)} دج</p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/deposits")}
                className="hover:bg-primary/10"
              >
                شحن الرصيد
              </Button>
            </div>
          </CardContent>
        </Card>

        <Alert className="mb-6 bg-primary/10 border-primary/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            اختر المنصة أو اللعبة، ثم أدخل معرف اللاعب والباقة المناسبة
          </AlertDescription>
        </Alert>

        {platformsLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as 'games' | 'betting' | 'orders')} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="games">الألعاب</TabsTrigger>
              <TabsTrigger value="betting">توقعات كرة القدم</TabsTrigger>
              <TabsTrigger value="orders">الطلبيات</TabsTrigger>
            </TabsList>

            <TabsContent value="games" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {gamePlatforms.map((platform) => (
                  <Card
                    key={platform.id}
                    className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 rounded-3xl ${
                      selectedPlatform === platform.id
                        ? 'ring-2 ring-primary shadow-lg scale-105'
                        : ''
                    }`}
                    onClick={() => handlePlatformSelect(platform.id, 'game')}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="aspect-square mb-3 rounded-2xl bg-gradient-primary/10 flex items-center justify-center p-2 overflow-hidden">
                        {getPlatformLogo(platform.slug, platform.logo_url) ? (
                          <img
                            src={getPlatformLogo(platform.slug, platform.logo_url)!}
                            alt={platform.name_ar}
                            className="w-full h-full object-contain rounded-2xl"
                          />
                        ) : (
                          <Gamepad2 className="h-12 w-12 text-primary" />
                        )}
                      </div>
                      <h3 className="font-semibold text-sm">{platform.name_ar}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="betting" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {bettingPlatforms.map((platform) => (
                  <Card
                    key={platform.id}
                    className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 rounded-3xl ${
                      selectedPlatform === platform.id
                        ? 'ring-2 ring-primary shadow-lg scale-105'
                        : ''
                    }`}
                    onClick={() => handlePlatformSelect(platform.id, 'betting')}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="aspect-square mb-3 rounded-2xl bg-gradient-gold/10 flex items-center justify-center p-2 overflow-hidden">
                        {getPlatformLogo(platform.slug, platform.logo_url) ? (
                          <img
                            src={getPlatformLogo(platform.slug, platform.logo_url)!}
                            alt={platform.name_ar}
                            className="w-full h-full object-contain rounded-2xl"
                          />
                        ) : (
                          <Gamepad2 className="h-12 w-12 text-primary" />
                        )}
                      </div>
                      <h3 className="font-semibold text-sm">{platform.name_ar}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-4">
              {ordersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : orders && orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const platformName = order.platform?.name_ar || "منصة غير معروفة";
                    const packageName = order.package?.name_ar || "باقة غير معروفة";
                    const statusColors = {
                      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                      completed: "bg-green-500/10 text-green-500 border-green-500/20",
                      rejected: "bg-red-500/10 text-red-500 border-red-500/20"
                    };
                    const statusText = {
                      pending: "قيد المعالجة",
                      completed: "تم القبول",
                      rejected: "تم الرفض"
                    };

                    return (
                      <Card key={order.id} className="hover-lift">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-lg">{platformName}</CardTitle>
                              <CardDescription>{packageName}</CardDescription>
                            </div>
                            <Badge className={`${statusColors[order.status as keyof typeof statusColors]} border`}>
                              {statusText[order.status as keyof typeof statusText]}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">معرف اللاعب:</span>
                            <span className="font-medium">{order.player_id}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">المبلغ:</span>
                            <span className="font-bold text-primary">{order.amount} دج</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">التاريخ:</span>
                            <span>{new Date(order.created_at).toLocaleDateString('ar-DZ', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                          
                          {/* Proof Image - Show when order is completed and proof exists */}
                          {order.status === 'completed' && order.proof_image_url && (
                            <div className="mt-4 space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                                <AlertCircle className="h-4 w-4" />
                                <span>وصل الشحن</span>
                              </div>
                              <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
                                <img 
                                  src={order.proof_image_url} 
                                  alt="وصل الشحن"
                                  className="w-full h-auto object-contain max-h-96 cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(order.proof_image_url, '_blank')}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground text-center">
                                اضغط على الصورة لعرضها بالحجم الكامل
                              </p>
                            </div>
                          )}
                          
                          {order.admin_notes && (
                            <Alert className="mt-3">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-sm">
                                <strong>ملاحظة الإدارة:</strong> {order.admin_notes}
                              </AlertDescription>
                            </Alert>
                          )}
                          {order.notes && (
                            <div className="text-sm mt-2 p-2 bg-muted rounded-md">
                              <span className="text-muted-foreground">ملاحظاتك:</span> {order.notes}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">لا توجد طلبيات بعد</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      ابدأ بطلب شحن لحسابك من تبويب الألعاب
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Order Form / Betting Form */}
        {selectedPlatform && selectedPlatformData && (
          <>
            {selectedPlatformData.category === 'betting' ? (
              <div className="mt-6">
                <BettingForm
                  key={selectedPlatform}
                  platformId={selectedPlatform}
                  platformName={selectedPlatformData.name_ar}
                  balance={balance}
                  onBalanceUpdate={fetchBalance}
                />
              </div>
            ) : (
              <Card className="shadow-card border-0 bg-gradient-card mt-6 animate-fade-in">
                <CardHeader>
                  <CardTitle>معلومات الشحن</CardTitle>
                  <CardDescription>
                    {selectedPlatformData.name_ar}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Player ID */}
                    <div className="space-y-2">
                      <Label htmlFor="playerId">معرف اللاعب / الحساب</Label>
                      <Input
                        id="playerId"
                        type="text"
                        placeholder="أدخل معرف اللاعب أو رقم الحساب"
                        value={playerId}
                        onChange={(e) => setPlayerId(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        يمكنك العثور على معرفك في إعدادات اللعبة أو الحساب
                      </p>
                    </div>

                    {/* Package Selection */}
                    {playerId && (
                      <div className="space-y-3">
                        <Label>اختر الباقة</Label>
                        {packagesLoading ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {packages?.map((pkg) => (
                              <Card
                                key={pkg.id}
                                className={`cursor-pointer transition-all duration-300 hover:shadow-md ${
                                  selectedPackage === pkg.id
                                    ? 'ring-2 ring-primary shadow-md'
                                    : ''
                                }`}
                                onClick={() => setSelectedPackage(pkg.id)}
                              >
                                <CardContent className="p-4 text-center">
                                  <div className="font-semibold text-lg mb-1">
                                    {pkg.name_ar}
                                  </div>
                                  <Badge variant="secondary" className="bg-gradient-primary text-white">
                                    {pkg.price} دج
                                  </Badge>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Price Summary */}
                    {selectedPackage && (
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">السعر:</span>
                          <span className="font-bold text-lg">{getSelectedPackagePrice()} دج</span>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full bg-gradient-primary hover:opacity-90"
                      disabled={createOrder.isPending || !selectedPlatform || !playerId || !selectedPackage}
                    >
                      {createOrder.isPending ? (
                        <>
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          جاري الشحن...
                        </>
                      ) : (
                        "شحن الآن"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Info Card */}
        <Card className="mt-6 bg-muted/30 border-0">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              ملاحظات مهمة
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1 pr-6">
              <li>• الشحن يتم خلال 5-30 دقيقة بعد إتمام الطلب</li>
              <li>• تأكد من صحة معرف اللاعب أو رقم الحساب</li>
              <li>• لا يمكن استرجاع المبلغ بعد الشحن</li>
              <li>• للمساعدة تواصل مع الدعم الفني</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Under Review Dialog */}
      <Dialog open={showUnderReviewDialog} onOpenChange={setShowUnderReviewDialog}>
        <DialogContent className="sm:max-w-md text-center" dir="rtl">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-gold/20 blur-3xl rounded-full animate-pulse"></div>
                <div className="relative bg-gradient-gold/10 p-8 rounded-full border-4 border-gradient-gold/30">
                  <Lock className="h-20 w-20 text-primary animate-pulse" />
                </div>
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-center">
              قيد المراجعة
            </DialogTitle>
            <DialogDescription className="text-center text-base mt-2">
              نعمل حالياً على تحسين خدمة المراهنات لتقديم أفضل تجربة لك. سيتم إطلاق الخدمة قريباً.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Button
              onClick={() => setShowUnderReviewDialog(false)}
              className="w-full bg-gradient-primary hover:opacity-90"
            >
              حسناً، فهمت
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GameTopup;
