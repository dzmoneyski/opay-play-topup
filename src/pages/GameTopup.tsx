import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Gamepad2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const GameTopup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedGame, setSelectedGame] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [loading, setLoading] = useState(false);

  const games = [
    { id: "pubg", name: "PUBG Mobile", icon: "🎮" },
    { id: "freefire", name: "Free Fire", icon: "🔥" },
    { id: "codm", name: "Call of Duty Mobile", icon: "🎯" },
    { id: "mobilelegends", name: "Mobile Legends", icon: "⚔️" },
  ];

  const packages = {
    pubg: [
      { id: "60uc", name: "60 UC", price: 150 },
      { id: "325uc", name: "325 UC", price: 750 },
      { id: "660uc", name: "660 UC", price: 1500 },
      { id: "1800uc", name: "1800 UC", price: 3750 },
    ],
    freefire: [
      { id: "100d", name: "100 ماسة", price: 200 },
      { id: "310d", name: "310 ماسة", price: 600 },
      { id: "520d", name: "520 ماسة", price: 1000 },
      { id: "1060d", name: "1060 ماسة", price: 2000 },
    ],
    codm: [
      { id: "80cp", name: "80 CP", price: 180 },
      { id: "400cp", name: "400 CP", price: 800 },
      { id: "800cp", name: "800 CP", price: 1600 },
      { id: "2000cp", name: "2000 CP", price: 4000 },
    ],
    mobilelegends: [
      { id: "86d", name: "86 ماسة", price: 170 },
      { id: "172d", name: "172 ماسة", price: 340 },
      { id: "344d", name: "344 ماسة", price: 680 },
      { id: "706d", name: "706 ماسة", price: 1360 },
    ],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGame || !playerId || !selectedPackage) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    // محاكاة عملية الشحن
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "تم إرسال الطلب",
        description: "سيتم شحن حسابك خلال دقائق",
      });
      navigate("/");
    }, 2000);
  };

  const getCurrentPackages = () => {
    if (!selectedGame) return [];
    return packages[selectedGame as keyof typeof packages] || [];
  };

  const getSelectedPackagePrice = () => {
    const currentPackages = getCurrentPackages();
    const pkg = currentPackages.find(p => p.id === selectedPackage);
    return pkg?.price || 0;
  };

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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Alert className="mb-6 bg-primary/10 border-primary/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            تأكد من إدخال معرف اللاعب بشكل صحيح. الشحن فوري بعد الدفع.
          </AlertDescription>
        </Alert>

        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle>معلومات الشحن</CardTitle>
            <CardDescription>اختر اللعبة والباقة المناسبة</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Game Selection */}
              <div className="space-y-2">
                <Label htmlFor="game">اختر اللعبة</Label>
                <Select value={selectedGame} onValueChange={(value) => {
                  setSelectedGame(value);
                  setSelectedPackage("");
                }}>
                  <SelectTrigger id="game">
                    <SelectValue placeholder="اختر اللعبة" />
                  </SelectTrigger>
                  <SelectContent>
                    {games.map((game) => (
                      <SelectItem key={game.id} value={game.id}>
                        <div className="flex items-center gap-2">
                          <span>{game.icon}</span>
                          <span>{game.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Player ID */}
              {selectedGame && (
                <div className="space-y-2">
                  <Label htmlFor="playerId">معرف اللاعب</Label>
                  <Input
                    id="playerId"
                    type="text"
                    placeholder="أدخل معرف اللاعب"
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    يمكنك العثور على معرفك في إعدادات اللعبة
                  </p>
                </div>
              )}

              {/* Package Selection */}
              {selectedGame && playerId && (
                <div className="space-y-2">
                  <Label htmlFor="package">اختر الباقة</Label>
                  <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                    <SelectTrigger id="package">
                      <SelectValue placeholder="اختر الباقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {getCurrentPackages().map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span>{pkg.name}</span>
                            <span className="font-bold text-primary">{pkg.price} دج</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                disabled={loading || !selectedGame || !playerId || !selectedPackage}
              >
                {loading ? "جاري الشحن..." : "شحن الآن"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-muted/30 border-0">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              ملاحظات مهمة
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1 pr-6">
              <li>• الشحن فوري بعد إتمام الدفع</li>
              <li>• تأكد من صحة معرف اللاعب</li>
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
