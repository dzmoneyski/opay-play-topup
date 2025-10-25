import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useBalance } from "@/hooks/useBalance";
import {
  useVerifyBettingAccount,
  useCreateBettingDeposit,
  useCreateBettingWithdrawal,
  useBettingAccount,
} from "@/hooks/useBettingPlatforms";

interface BettingFormProps {
  platformId: string;
  platformName: string;
}

export const BettingForm: React.FC<BettingFormProps> = ({ platformId, platformName }) => {
  const [step, setStep] = useState<'verify' | 'actions'>('verify');
  const [playerId, setPlayerId] = useState("");
  const [promoCode, setPromoCode] = useState("dz21");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawalCode, setWithdrawalCode] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");

  const { balance } = useBalance();
  const verifyAccount = useVerifyBettingAccount();
  const createDeposit = useCreateBettingDeposit();
  const createWithdrawal = useCreateBettingWithdrawal();
  const { data: bettingAccount } = useBettingAccount(platformId, playerId);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    verifyAccount.mutate(
      {
        platform_id: platformId,
        player_id: playerId,
        promo_code: promoCode,
      },
      {
        onSuccess: (data: any) => {
          if (data.success) {
            setStep('actions');
          }
        },
      }
    );
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    createDeposit.mutate({
      platform_id: platformId,
      player_id: playerId,
      amount: parseFloat(depositAmount),
    });
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    createWithdrawal.mutate({
      platform_id: platformId,
      player_id: playerId,
      withdrawal_code: withdrawalCode,
      amount: parseFloat(withdrawalAmount),
    });
  };

  // If account is already verified, show actions directly
  React.useEffect(() => {
    if (bettingAccount?.is_verified) {
      setStep('actions');
    } else if (bettingAccount && !bettingAccount.is_verified) {
      // Account exists but not verified yet
      setStep('verify');
    }
  }, [bettingAccount]);

  return (
    <Card className="shadow-card border-0 bg-gradient-card animate-fade-in">
      <CardHeader>
        <CardTitle>{platformName}</CardTitle>
        <CardDescription>
          {step === 'verify' ? 'التحقق من حسابك' : 'الإيداع والسحب'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'verify' ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playerId">معرف اللاعب</Label>
              <Input
                id="playerId"
                type="text"
                placeholder="أدخل معرف اللاعب الخاص بك"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promoCode">كود البرومو</Label>
              <Input
                id="promoCode"
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                required
                disabled
              />
              <p className="text-xs text-muted-foreground">
                تأكد من التسجيل في المنصة بكود البرومو: dz21
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90"
              disabled={verifyAccount.isPending || !playerId}
            >
              {verifyAccount.isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                <>
                  <CheckCircle className="ml-2 h-4 w-4" />
                  التحقق من الحساب
                </>
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Account Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">معرف اللاعب:</span>
                <Badge variant="secondary">{playerId}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">حالة التحقق:</span>
                <Badge className="bg-green-500 text-white">
                  <CheckCircle className="ml-1 h-3 w-3" />
                  محقق
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">رصيدك الحالي:</span>
                <span className="font-bold text-lg">{balance?.balance || 0} دج</span>
              </div>
            </div>

            {/* Deposit/Withdrawal Tabs */}
            <Tabs defaultValue="deposit" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="deposit">الإيداع</TabsTrigger>
                <TabsTrigger value="withdrawal">السحب</TabsTrigger>
              </TabsList>

              <TabsContent value="deposit">
                <form onSubmit={handleDeposit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="depositAmount">المبلغ المراد إيداعه</Label>
                    <Input
                      id="depositAmount"
                      type="number"
                      placeholder="أدخل المبلغ"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      min="1"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      سيتم خصم المبلغ + العمولة من رصيدك
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:opacity-90"
                    disabled={createDeposit.isPending || !depositAmount}
                  >
                    {createDeposit.isPending ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري الإيداع...
                      </>
                    ) : (
                      "إيداع الآن"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="withdrawal">
                <form onSubmit={handleWithdrawal} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="withdrawalCode">كود السحب من المنصة</Label>
                    <Input
                      id="withdrawalCode"
                      type="text"
                      placeholder="أدخل كود السحب من المنصة"
                      value={withdrawalCode}
                      onChange={(e) => setWithdrawalCode(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      احصل على كود السحب من المنصة أولاً
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="withdrawalAmount">المبلغ المراد سحبه</Label>
                    <Input
                      id="withdrawalAmount"
                      type="number"
                      placeholder="أدخل المبلغ"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      min="1"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-secondary hover:opacity-90"
                    disabled={createWithdrawal.isPending || !withdrawalCode || !withdrawalAmount}
                  >
                    {createWithdrawal.isPending ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري إرسال الطلب...
                      </>
                    ) : (
                      "طلب السحب"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
