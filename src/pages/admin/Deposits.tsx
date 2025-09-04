import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAdminDeposits } from '@/hooks/useAdminDeposits';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowDownToLine,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Banknote,
  Receipt,
  Eye
} from 'lucide-react';

export default function DepositsPage() {
  const { deposits, loading, approveDeposit, rejectDeposit } = useAdminDeposits();
  const [selectedDeposit, setSelectedDeposit] = React.useState<any>(null);
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [approvalNotes, setApprovalNotes] = React.useState('');
  const [processing, setProcessing] = React.useState(false);

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    const { data } = supabase.storage.from('deposit-receipts').getPublicUrl(imagePath);
    return data.publicUrl;
  };

  const handleApprove = async (depositId: string, notes?: string) => {
    setProcessing(true);
    const result = await approveDeposit(depositId, notes);
    if (result.success) {
      setApprovalNotes('');
      setSelectedDeposit(null);
    }
    setProcessing(false);
  };

  const handleReject = async (depositId: string, reason: string) => {
    setProcessing(true);
    const result = await rejectDeposit(depositId, reason);
    if (result.success) {
      setRejectionReason('');
      setSelectedDeposit(null);
    }
    setProcessing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            قيد المراجعة
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            مقبول
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            مرفوض
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const pendingDeposits = deposits.filter(d => d.status === 'pending');
  const approvedDeposits = deposits.filter(d => d.status === 'approved').length;
  const rejectedDeposits = deposits.filter(d => d.status === 'rejected').length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">إدارة طلبات الإيداع</h1>
        <p className="text-muted-foreground mt-2">
          مراجعة وإدارة طلبات إيداع الأموال المقدمة من المستخدمين
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد المراجعة</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingDeposits.length}</div>
            <p className="text-xs text-muted-foreground">تحتاج مراجعة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مقبولة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedDeposits}</div>
            <p className="text-xs text-muted-foreground">تم قبولها</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مرفوضة</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedDeposits}</div>
            <p className="text-xs text-muted-foreground">تم رفضها</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Deposits */}
      {pendingDeposits.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            طلبات تحتاج مراجعة ({pendingDeposits.length})
          </h2>
          
          <div className="space-y-4">
            {pendingDeposits.map((deposit) => (
              <Card key={deposit.id} className="border-l-4 border-l-yellow-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{deposit.profiles?.full_name || 'مستخدم غير محدد'}</span>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Banknote className="h-3 w-3" />
                          <span>{formatAmount(deposit.amount)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <ArrowDownToLine className="h-3 w-3" />
                          <span>{deposit.payment_method}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(deposit.created_at)}</span>
                        </span>
                      </CardDescription>
                    </div>
                    {getStatusBadge(deposit.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Deposit Details */}
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">معرف المعاملة:</span>
                      <span className="font-medium">{deposit.transaction_id || 'غير محدد'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">رقم الهاتف:</span>
                      <span className="font-medium">{deposit.profiles?.phone || 'غير محدد'}</span>
                    </div>
                  </div>

                  {/* Receipt Image */}
                  {deposit.receipt_image && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">صورة الوصل</h4>
                      <img
                        src={getImageUrl(deposit.receipt_image) || ''}
                        alt="وصل الإيداع"
                        className="max-w-md max-h-64 object-contain border rounded-md cursor-pointer"
                        onClick={() => window.open(getImageUrl(deposit.receipt_image) || '', '_blank')}
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => setSelectedDeposit(deposit)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          قبول الطلب
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>قبول طلب الإيداع</DialogTitle>
                          <DialogDescription>
                            هل أنت متأكد من قبول طلب إيداع {formatAmount(deposit.amount)} من {deposit.profiles?.full_name}؟
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="approval-notes">ملاحظات (اختيارية)</Label>
                            <Textarea
                              id="approval-notes"
                              placeholder="ملاحظات حول الطلب..."
                              value={approvalNotes}
                              onChange={(e) => setApprovalNotes(e.target.value)}
                              rows={3}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => selectedDeposit && handleApprove(selectedDeposit.id, approvalNotes)}
                            disabled={processing}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            تأكيد القبول
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="destructive"
                          onClick={() => setSelectedDeposit(deposit)}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          رفض الطلب
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>رفض طلب الإيداع</DialogTitle>
                          <DialogDescription>
                            يرجى إدخال سبب رفض الطلب
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="rejection-reason">سبب الرفض *</Label>
                            <Textarea
                              id="rejection-reason"
                              placeholder="سبب الرفض (مثال: وصل غير واضح، مبلغ غير صحيح، إلخ)"
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              rows={3}
                              required
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="destructive"
                            onClick={() => selectedDeposit && handleReject(selectedDeposit.id, rejectionReason)}
                            disabled={processing || !rejectionReason.trim()}
                          >
                            تأكيد الرفض
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Deposits History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            تاريخ جميع الطلبات
          </CardTitle>
          <CardDescription>
            جميع طلبات الإيداع في النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deposits.length === 0 ? (
            <div className="text-center py-8">
              <ArrowDownToLine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد طلبات إيداع</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deposits.map((deposit) => (
                <div key={deposit.id} className={`border rounded-lg p-4 ${
                  deposit.status === 'pending' ? 'border-l-4 border-l-yellow-500' : 
                  deposit.status === 'approved' ? 'border-l-4 border-l-green-500' : 
                  'border-l-4 border-l-red-500'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{formatAmount(deposit.amount)}</span>
                      <span className="text-sm text-muted-foreground">
                        {deposit.profiles?.full_name || 'مستخدم غير محدد'}
                      </span>
                    </div>
                    {getStatusBadge(deposit.status)}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>طريقة الدفع: {deposit.payment_method}</p>
                    <p>معرف المعاملة: {deposit.transaction_id}</p>
                    <p>تاريخ الطلب: {formatDate(deposit.created_at)}</p>
                    {deposit.processed_at && (
                      <p>تاريخ المراجعة: {formatDate(deposit.processed_at)}</p>
                    )}
                    {deposit.admin_notes && (
                      <p className="font-medium text-blue-600">ملاحظة: {deposit.admin_notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}