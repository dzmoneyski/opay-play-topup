import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle, AlertCircle, ArrowUpCircle, ArrowDownCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBalance, UserBalance } from "@/hooks/useBalance";
import {
  useVerifyBettingAccount,
  useCreateBettingDeposit,
  useCreateBettingWithdrawal,
  useUserBettingAccountForPlatform,
} from "@/hooks/useBettingPlatforms";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface BettingFormProps {
  platformId: string;
  platformName: string;
  balance: UserBalance | null;
  onBalanceUpdate: () => void;
}

export const BettingForm: React.FC<BettingFormProps> = ({ platformId, platformName, balance: parentBalance, onBalanceUpdate }) => {
  const [step, setStep] = useState<'verify' | 'actions'>('verify');
  const [playerId, setPlayerId] = useState("");
  const [promoCode, setPromoCode] = useState("dz21");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawalCode, setWithdrawalCode] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const { user } = useAuth();
  const verifyAccount = useVerifyBettingAccount();
  const createDeposit = useCreateBettingDeposit();
  const createWithdrawal = useCreateBettingWithdrawal();
  const { data: bettingAccount, refetch: refetchAccount } = useUserBettingAccountForPlatform(platformId);

  const fetchTransactions = React.useCallback(async () => {
    if (!user || !platformId) return;
    
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from('betting_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform_id', platformId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  }, [user, platformId]);

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
          // Refetch the account to get the latest status
          refetchAccount();
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
    }, {
      onSuccess: () => {
        setDepositAmount('');
        fetchTransactions();
        onBalanceUpdate();
      }
    });
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    createWithdrawal.mutate({
      platform_id: platformId,
      player_id: playerId,
      withdrawal_code: withdrawalCode,
      amount: parseFloat(withdrawalAmount),
    }, {
      onSuccess: () => {
        setWithdrawalCode('');
        setWithdrawalAmount('');
        fetchTransactions();
        onBalanceUpdate();
      }
    });
  };

  // Initialize playerId from existing account if available
  React.useEffect(() => {
    if (bettingAccount?.player_id && !playerId) {
      setPlayerId(bettingAccount.player_id);
    }
    if (bettingAccount?.promo_code && !promoCode) {
      setPromoCode(bettingAccount.promo_code);
    }
  }, [bettingAccount]);

  // If account is already verified, show actions directly
  React.useEffect(() => {
    if (bettingAccount?.is_verified) {
      setStep('actions');
      fetchTransactions();
    } else if (bettingAccount && !bettingAccount.is_verified) {
      // Account exists but not verified yet - stay on verify step to show pending message
      setStep('verify');
    }
  }, [bettingAccount, fetchTransactions]);

  // Check if account exists but not verified
  const isPending = bettingAccount && !bettingAccount.is_verified;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'قيد المراجعة', variant: 'secondary' as const },
      completed: { label: 'مكتمل', variant: 'default' as const },
      rejected: { label: 'مرفوض', variant: 'destructive' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card className="shadow-card border-0 bg-gradient-card animate-fade-in">
      <CardHeader>
        <CardTitle>{platformName}</CardTitle>
        <CardDescription>
          {isPending 
            ? 'طلبك قيد المراجعة' 
            : step === 'verify' 
            ? 'التحقق من حسابك' 
            : 'الإيداع والسحب'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-4 text-center py-8">
            <div className="flex justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">طلب التحقق قيد المراجعة</h3>
              <p className="text-muted-foreground mb-4">
                سيقوم المشرف بمراجعة طلبك والتحقق من حسابك على المنصة
              </p>
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">معرف اللاعب:</span>
                  <Badge variant="secondary" className="font-mono">{playerId || bettingAccount?.player_id}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">كود البرومو:</span>
                  <Badge variant="secondary">{promoCode || bettingAccount?.promo_code}</Badge>
                </div>
              </div>
            </div>
          </div>
        ) : step === 'verify' ? (
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
              <p className="text-xs text-amber-500 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                تنبيه: معرف اللاعب يختلف من منصة لأخرى
              </p>
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
                <span className="font-bold text-lg">{Math.floor(parentBalance?.balance || 0)} دج</span>
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

            {/* Transactions History */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                معاملاتك الأخيرة
              </h3>
              
              {loadingTransactions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : transactions.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    لا توجد معاملات حتى الآن
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <Card key={transaction.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {transaction.transaction_type === 'deposit' ? (
                                <ArrowUpCircle className="h-5 w-5 text-destructive" />
                              ) : (
                                <ArrowDownCircle className="h-5 w-5 text-success" />
                              )}
                              <div>
                                <p className="font-medium">
                                  {transaction.transaction_type === 'deposit' ? 'إيداع' : 'سحب'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(transaction.created_at).toLocaleDateString('ar-DZ', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                                {transaction.admin_notes && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    ملاحظة: {transaction.admin_notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-lg">
                                {Math.floor(transaction.amount)} دج
                              </p>
                              {getStatusBadge(transaction.status)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
              
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <AlertCircle className="inline h-4 w-4 ml-1" />
                  <strong>ملاحظة:</strong> يتم خصم رسوم 2% من كل إيداع (حد أدنى 10 دج، حد أقصى 500 دج)
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
