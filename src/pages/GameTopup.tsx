import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Gamepad2, AlertCircle, Loader2, Wallet } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGamePlatforms, useGamePackages, useCreateGameTopupOrder } from "@/hooks/useGamePlatforms";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BettingForm } from "@/components/BettingForm";
import { useBalance } from "@/hooks/useBalance";

const GameTopup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'games' | 'betting'>('games');
  
  const { data: platforms, isLoading: platformsLoading } = useGamePlatforms();
  const { data: packages, isLoading: packagesLoading } = useGamePackages(selectedPlatform);
  const createOrder = useCreateGameTopupOrder();
  const { balance, loading: balanceLoading } = useBalance();

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
    setSelectedPlatform(platformId);
    setSelectedPackage(null);
    setPlayerId("");
    if (category === 'betting') {
      setCurrentTab('betting');
    } else {
      setCurrentTab('games');
    }
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
          <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as 'games' | 'betting')} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="games">الألعاب</TabsTrigger>
              <TabsTrigger value="betting">توقعات كرة القدم</TabsTrigger>
            </TabsList>

            <TabsContent value="games" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {gamePlatforms.map((platform) => (
                  <Card
                    key={platform.id}
                    className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                      selectedPlatform === platform.id
                        ? 'ring-2 ring-primary shadow-lg scale-105'
                        : ''
                    }`}
                    onClick={() => handlePlatformSelect(platform.id, 'game')}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="aspect-square mb-3 rounded-xl bg-gradient-primary/10 flex items-center justify-center">
                        {platform.logo_url ? (
                          <img
                            src={platform.logo_url}
                            alt={platform.name_ar}
                            className="w-full h-full object-contain rounded-xl"
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
                    className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                      selectedPlatform === platform.id
                        ? 'ring-2 ring-primary shadow-lg scale-105'
                        : ''
                    }`}
                    onClick={() => handlePlatformSelect(platform.id, 'betting')}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="aspect-square mb-3 rounded-xl bg-gradient-gold/10 flex items-center justify-center">
                        {platform.logo_url ? (
                          <img
                            src={platform.logo_url}
                            alt={platform.name_ar}
                            className="w-full h-full object-contain rounded-xl"
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
    </div>
  );
};

export default GameTopup;
