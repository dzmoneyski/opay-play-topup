import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle, Eye, AlertCircle } from "lucide-react";
import {
  useAdminBettingAccounts,
  useAdminBettingTransactions,
  useApproveBettingAccount,
  useRejectBettingAccount,
  useRejectBettingDeposit,
  useApproveWithdrawal,
  useRejectWithdrawal,
} from "@/hooks/useBettingPlatforms";
import { BettingFormTest } from "@/components/BettingFormTest";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const BettingManagement = () => {
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const { toast } = useToast();

  const { data: accounts, isLoading: accountsLoading } = useAdminBettingAccounts();
  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useAdminBettingTransactions();

  const approveAccount = useApproveBettingAccount();
  const rejectAccount = useRejectBettingAccount();
  const rejectDepositMutation = useRejectBettingDeposit();
  const approveWithdrawal = useApproveWithdrawal();
  const rejectWithdrawal = useRejectWithdrawal();

  const pendingAccounts = accounts?.filter(acc => !acc.is_verified) || [];
  const verifiedAccounts = accounts?.filter(acc => acc.is_verified) || [];
  const deposits = transactions?.filter(t => t.transaction_type === 'deposit') || [];
  const withdrawals = transactions?.filter(t => t.transaction_type === 'withdrawal') || [];
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const pendingDeposits = deposits.filter(d => d.status === 'pending');

  const handleApproveAccount = (accountId: string) => {
    approveAccount.mutate(accountId, {
      onSuccess: () => setSelectedAccount(null),
    });
  };

  const handleRejectAccount = (accountId: string) => {
    rejectAccount.mutate(accountId, {
      onSuccess: () => setSelectedAccount(null),
    });
  };

  const handleApproveWithdrawal = () => {
    if (!selectedTransaction) return;
    approveWithdrawal.mutate(
      {
        transactionId: selectedTransaction.id,
        adminNotes,
      },
      {
        onSuccess: () => {
          setSelectedTransaction(null);
          setAdminNotes("");
        },
      }
    );
  };

  const handleRejectWithdrawal = () => {
    if (!selectedTransaction) return;
    rejectWithdrawal.mutate(
      {
        transactionId: selectedTransaction.id,
        adminNotes,
      },
      {
        onSuccess: () => {
          setSelectedTransaction(null);
          setAdminNotes("");
        },
      }
    );
  };

  const handleApproveDeposit = async () => {
    if (!selectedDeposit) return;
    
    try {
      const { data, error } = await supabase.rpc('approve_betting_deposit', {
        _transaction_id: selectedDeposit.id,
        _admin_notes: adminNotes || null,
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: "تمت الموافقة على الإيداع",
          description: `تم خصم ${result.total_deducted} دج من رصيد المستخدم`,
        });
        refetchTransactions();
        setSelectedDeposit(null);
        setAdminNotes("");
      } else {
        toast({
          title: "خطأ",
          description: result?.error || "حدث خطأ أثناء الموافقة",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectDeposit = () => {
    if (!selectedDeposit) return;

    rejectDepositMutation.mutate(
      {
        transactionId: selectedDeposit.id,
        notes: adminNotes || undefined
      },
      {
        onSuccess: () => {
          refetchTransactions();
          setSelectedDeposit(null);
          setAdminNotes("");
        }
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">قيد الانتظار</Badge>;
      case 'completed':
        return <Badge className="bg-green-500 text-white">مكتمل</Badge>;
      case 'rejected':
        return <Badge variant="destructive">مرفوض</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">إدارة المراهنات</h1>
        <p className="text-muted-foreground">
          التحقق من الحسابات وإدارة عمليات الإيداع والسحب
        </p>
      </div>

      {/* Connection Test Alert */}
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          اختبار الاتصال بقاعدة البيانات - تأكد من أن جميع الأنظمة تعمل بشكل صحيح
        </AlertDescription>
      </Alert>

      {/* Test Component */}
      <div className="mb-6">
        <BettingFormTest />
      </div>

      <Tabs defaultValue="pending-accounts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending-accounts">
            طلبات التحقق
            {pendingAccounts.length > 0 && (
              <Badge variant="destructive" className="mr-2">
                {pendingAccounts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="verified-accounts">الحسابات المحققة</TabsTrigger>
          <TabsTrigger value="deposits">
            طلبات الإيداع
            {pendingDeposits.length > 0 && (
              <Badge variant="destructive" className="mr-2">
                {pendingDeposits.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="withdrawals">
            طلبات السحب
            {pendingWithdrawals.length > 0 && (
              <Badge variant="destructive" className="mr-2">
                {pendingWithdrawals.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Pending Accounts Tab */}
        <TabsContent value="pending-accounts">
          <Card>
            <CardHeader>
              <CardTitle>طلبات التحقق من الحسابات</CardTitle>
              <CardDescription>
                تحقق من أن اللاعبين مسجلين بكود البرومو dz21 على المنصة قبل الموافقة
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accountsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : pendingAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد طلبات تحقق جديدة
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>رقم الهاتف</TableHead>
                      <TableHead>المنصة</TableHead>
                      <TableHead>معرف اللاعب</TableHead>
                      <TableHead>كود البرومو</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingAccounts.map((account: any) => (
                      <TableRow key={account.id}>
                        <TableCell>{account.user?.full_name || "غير محدد"}</TableCell>
                        <TableCell>{account.user?.phone || "غير محدد"}</TableCell>
                        <TableCell>{account.platform?.name_ar || "غير محدد"}</TableCell>
                        <TableCell className="font-mono">{account.player_id}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{account.promo_code}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(account.created_at).toLocaleDateString("ar-DZ")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedAccount(account)}
                            >
                              <Eye className="h-4 w-4 ml-1" />
                              عرض
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verified Accounts Tab */}
        <TabsContent value="verified-accounts">
          <Card>
            <CardHeader>
              <CardTitle>الحسابات المحققة</CardTitle>
            </CardHeader>
            <CardContent>
              {accountsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : verifiedAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد حسابات محققة
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>المنصة</TableHead>
                      <TableHead>معرف اللاعب</TableHead>
                      <TableHead>تاريخ التحقق</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verifiedAccounts.map((account: any) => (
                      <TableRow key={account.id}>
                        <TableCell>{account.user?.full_name || "غير محدد"}</TableCell>
                        <TableCell>{account.platform?.name_ar || "غير محدد"}</TableCell>
                        <TableCell className="font-mono">{account.player_id}</TableCell>
                        <TableCell>
                          {account.verified_at
                            ? new Date(account.verified_at).toLocaleDateString("ar-DZ")
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <CardTitle>طلبات السحب</CardTitle>
              <CardDescription>
                راجع كود السحب على المنصة قبل الموافقة
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد طلبات سحب
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>المنصة</TableHead>
                      <TableHead>معرف اللاعب</TableHead>
                      <TableHead>كود السحب</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.user?.full_name || "غير محدد"}</TableCell>
                        <TableCell>{transaction.platform?.name_ar || "غير محدد"}</TableCell>
                        <TableCell className="font-mono">{transaction.player_id}</TableCell>
                        <TableCell className="font-mono font-bold">
                          {transaction.withdrawal_code}
                        </TableCell>
                        <TableCell className="font-bold">{transaction.amount} دج</TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell>
                          {new Date(transaction.created_at).toLocaleDateString("ar-DZ")}
                        </TableCell>
                        <TableCell>
                          {transaction.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedTransaction(transaction)}
                            >
                              <Eye className="h-4 w-4 ml-1" />
                              مراجعة
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deposits Tab */}
        <TabsContent value="deposits">
          <Card>
            <CardHeader>
              <CardTitle>طلبات الإيداع</CardTitle>
              <CardDescription>راجع طلبات الإيداع وقم بالموافقة عليها</CardDescription>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : deposits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد عمليات إيداع
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>المنصة</TableHead>
                      <TableHead>معرف اللاعب</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deposits.map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.user?.full_name || "غير محدد"}</TableCell>
                        <TableCell>{transaction.platform?.name_ar || "غير محدد"}</TableCell>
                        <TableCell className="font-mono">{transaction.player_id}</TableCell>
                        <TableCell className="font-bold">{transaction.amount} دج</TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell>
                          {new Date(transaction.created_at).toLocaleDateString("ar-DZ")}
                        </TableCell>
                        <TableCell>
                          {transaction.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedDeposit(transaction)}
                            >
                              <Eye className="h-4 w-4 ml-1" />
                              مراجعة
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Account Verification Dialog */}
      <Dialog open={!!selectedAccount} onOpenChange={() => setSelectedAccount(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>التحقق من الحساب</DialogTitle>
            <DialogDescription>
              تحقق من المعلومات على المنصة قبل الموافقة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>المستخدم</Label>
              <p className="text-sm">{selectedAccount?.user?.full_name || "غير محدد"}</p>
            </div>
            <div>
              <Label>رقم الهاتف</Label>
              <p className="text-sm">{selectedAccount?.user?.phone || "غير محدد"}</p>
            </div>
            <div>
              <Label>المنصة</Label>
              <p className="text-sm">{selectedAccount?.platform?.name_ar || "غير محدد"}</p>
            </div>
            <div>
              <Label>معرف اللاعب</Label>
              <p className="text-sm font-mono font-bold">{selectedAccount?.player_id}</p>
            </div>
            <div>
              <Label>كود البرومو</Label>
              <Badge variant="secondary">{selectedAccount?.promo_code}</Badge>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>ملاحظة:</strong> تأكد من أن اللاعب مسجل على المنصة بكود البرومو{" "}
                <strong>dz21</strong> قبل الموافقة
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => handleRejectAccount(selectedAccount?.id)}
              disabled={rejectAccount.isPending}
            >
              {rejectAccount.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              ) : (
                <XCircle className="h-4 w-4 ml-1" />
              )}
              رفض
            </Button>
            <Button
              onClick={() => handleApproveAccount(selectedAccount?.id)}
              disabled={approveAccount.isPending}
              className="bg-green-500 hover:bg-green-600"
            >
              {approveAccount.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              ) : (
                <CheckCircle className="h-4 w-4 ml-1" />
              )}
              موافقة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Review Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>مراجعة طلب السحب</DialogTitle>
            <DialogDescription>
              تحقق من كود السحب على المنصة قبل الموافقة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>المستخدم</Label>
              <p className="text-sm">{selectedTransaction?.user?.full_name || "غير محدد"}</p>
            </div>
            <div>
              <Label>المنصة</Label>
              <p className="text-sm">{selectedTransaction?.platform?.name_ar || "غير محدد"}</p>
            </div>
            <div>
              <Label>معرف اللاعب</Label>
              <p className="text-sm font-mono">{selectedTransaction?.player_id}</p>
            </div>
            <div>
              <Label>كود السحب</Label>
              <p className="text-lg font-mono font-bold">{selectedTransaction?.withdrawal_code}</p>
            </div>
            <div>
              <Label>المبلغ</Label>
              <p className="text-lg font-bold">{selectedTransaction?.amount} دج</p>
            </div>
            <div>
              <Label>ملاحظات إدارية (اختياري)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="أضف ملاحظات..."
              />
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>ملاحظة:</strong> تحقق من كود السحب على المنصة. عند الموافقة سيتم إضافة
                المبلغ إلى رصيد المستخدم.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={handleRejectWithdrawal}
              disabled={rejectWithdrawal.isPending}
            >
              {rejectWithdrawal.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              ) : (
                <XCircle className="h-4 w-4 ml-1" />
              )}
              رفض
            </Button>
            <Button
              onClick={handleApproveWithdrawal}
              disabled={approveWithdrawal.isPending}
              className="bg-green-500 hover:bg-green-600"
            >
              {approveWithdrawal.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              ) : (
                <CheckCircle className="h-4 w-4 ml-1" />
              )}
              موافقة وإضافة الرصيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deposit Review Dialog */}
      <Dialog open={!!selectedDeposit} onOpenChange={() => setSelectedDeposit(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>مراجعة طلب الإيداع</DialogTitle>
            <DialogDescription>
              راجع طلب الإيداع قبل الموافقة. سيتم خصم المبلغ + العمولة من رصيد المستخدم.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>المستخدم</Label>
              <p className="text-sm">{selectedDeposit?.user?.full_name || "غير محدد"}</p>
            </div>
            <div>
              <Label>رقم الهاتف</Label>
              <p className="text-sm">{selectedDeposit?.user?.phone || "غير محدد"}</p>
            </div>
            <div>
              <Label>المنصة</Label>
              <p className="text-sm">{selectedDeposit?.platform?.name_ar || "غير محدد"}</p>
            </div>
            <div>
              <Label>معرف اللاعب</Label>
              <p className="text-sm font-mono">{selectedDeposit?.player_id}</p>
            </div>
            <div>
              <Label>المبلغ المطلوب</Label>
              <p className="text-lg font-bold">{selectedDeposit?.amount} دج</p>
            </div>
            <div>
              <Label>ملاحظات إدارية (اختياري)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="أضف ملاحظات..."
              />
            </div>
            <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/20">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <strong>تحذير:</strong> عند الموافقة سيتم:
              </p>
              <ul className="text-sm text-amber-600 dark:text-amber-400 pr-4 mt-2 space-y-1">
                <li>• خصم المبلغ + العمولة من رصيد المستخدم</li>
                <li>• إيداع المبلغ في حساب اللاعب على المنصة</li>
                <li>• لن يمكن التراجع عن العملية</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={handleRejectDeposit}
            >
              <XCircle className="h-4 w-4 ml-1" />
              رفض
            </Button>
            <Button
              onClick={handleApproveDeposit}
              className="bg-green-500 hover:bg-green-600"
            >
              <CheckCircle className="h-4 w-4 ml-1" />
              موافقة وخصم الرصيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BettingManagement;
