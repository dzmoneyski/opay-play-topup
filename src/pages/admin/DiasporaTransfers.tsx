import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Globe2, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Calendar,
  User,
  CreditCard,
  FileText,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface DiasporaTransfer {
  id: string;
  sender_id: string;
  amount: number;
  sender_country: string;
  sender_city: string | null;
  payment_method: string | null;
  transaction_reference: string | null;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  exchange_rate: number | null;
  amount_dzd: number | null;
  created_at: string;
  processed_at: string | null;
  profiles: {
    full_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
}

const DiasporaTransfers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTransfer, setSelectedTransfer] = useState<DiasporaTransfer | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [approvalData, setApprovalData] = useState({
    exchangeRate: '280',
    adminNotes: ''
  });
  
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch diaspora transfers
  const { data: transfers, isLoading } = useQuery({
    queryKey: ['admin-diaspora-transfers', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('diaspora_transfers')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: transfersData, error } = await query;
      if (error) throw error;

      // Fetch profiles separately
      const userIds = transfersData?.map(t => t.sender_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, email')
        .in('user_id', userIds);

      // Map profiles to transfers
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      
      return transfersData?.map(transfer => ({
        ...transfer,
        profiles: profilesMap.get(transfer.sender_id) || null
      })) as DiasporaTransfer[];
    }
  });

  // Approve transfer mutation
  const approveMutation = useMutation({
    mutationFn: async ({ transferId, exchangeRate, adminNotes }: { 
      transferId: string; 
      exchangeRate: number;
      adminNotes: string;
    }) => {
      const transfer = transfers?.find(t => t.id === transferId);
      if (!transfer) throw new Error('Transfer not found');

      const amountDzd = transfer.amount * exchangeRate;

      // Update transfer status
      const { error: updateError } = await supabase
        .from('diaspora_transfers')
        .update({
          status: 'approved',
          exchange_rate: exchangeRate,
          amount_dzd: amountDzd,
          admin_notes: adminNotes,
          processed_at: new Date().toISOString()
        })
        .eq('id', transferId);

      if (updateError) throw updateError;

      // Add deposit to credit user account
      const { error: depositError } = await supabase
        .from('deposits')
        .insert({
          user_id: transfer.sender_id,
          amount: amountDzd,
          payment_method: 'diaspora_transfer',
          status: 'approved',
          admin_notes: `تحويل من الجالية - ${transfer.sender_country}`,
          processed_at: new Date().toISOString()
        });

      if (depositError) throw depositError;

      // Update user balance
      const { error: balanceError } = await supabase.rpc('recalculate_user_balance', {
        _user_id: transfer.sender_id
      });

      if (balanceError) throw balanceError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-diaspora-transfers'] });
      toast({
        title: "تمت الموافقة بنجاح",
        description: "تم شحن رصيد المستخدم",
      });
      setShowApprovalDialog(false);
      setSelectedTransfer(null);
      setApprovalData({ exchangeRate: '280', adminNotes: '' });
    },
    onError: (error) => {
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Reject transfer mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ transferId, reason }: { transferId: string; reason: string }) => {
      const { error } = await supabase
        .from('diaspora_transfers')
        .update({
          status: 'rejected',
          admin_notes: reason,
          processed_at: new Date().toISOString()
        })
        .eq('id', transferId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-diaspora-transfers'] });
      toast({
        title: "تم الرفض",
        description: "تم رفض طلب التحويل",
      });
      setShowRejectionDialog(false);
      setSelectedTransfer(null);
      setRejectionReason('');
    },
    onError: (error) => {
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleApprove = (transfer: DiasporaTransfer) => {
    setSelectedTransfer(transfer);
    setShowApprovalDialog(true);
  };

  const handleReject = (transfer: DiasporaTransfer) => {
    setSelectedTransfer(transfer);
    setShowRejectionDialog(true);
  };

  const confirmApproval = () => {
    if (!selectedTransfer) return;
    
    const exchangeRate = parseFloat(approvalData.exchangeRate);
    if (isNaN(exchangeRate) || exchangeRate <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال سعر صرف صحيح",
        variant: "destructive"
      });
      return;
    }

    approveMutation.mutate({
      transferId: selectedTransfer.id,
      exchangeRate,
      adminNotes: approvalData.adminNotes
    });
  };

  const confirmRejection = () => {
    if (!selectedTransfer || !rejectionReason.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال سبب الرفض",
        variant: "destructive"
      });
      return;
    }

    rejectMutation.mutate({
      transferId: selectedTransfer.id,
      reason: rejectionReason
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">قيد المراجعة</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">مقبول</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">مرفوض</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string | null) => {
    const methods: Record<string, string> = {
      'revolut': 'Revolut',
      'wise': 'Wise',
      'paysera': 'Paysera',
      'bank_transfer': 'Bank Transfer',
      'western_union': 'Western Union',
      'other': 'أخرى'
    };
    return methods[method || ''] || method || '-';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = transfers?.filter(t => t.status === 'pending').length || 0;
  const approvedCount = transfers?.filter(t => t.status === 'approved').length || 0;
  const rejectedCount = transfers?.filter(t => t.status === 'rejected').length || 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Globe2 className="w-8 h-8 text-primary" />
          إدارة طلبات الجالية
        </h1>
        <p className="text-muted-foreground mt-2">
          إدارة طلبات تحويلات الجالية الجزائرية في الخارج
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">الإجمالي</p>
                <p className="text-2xl font-bold">{transfers?.length || 0}</p>
              </div>
              <Globe2 className="w-8 h-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">قيد المراجعة</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <FileText className="w-8 h-8 text-yellow-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">مقبول</p>
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">مرفوض</p>
                <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Label>تصفية حسب الحالة:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="pending">قيد المراجعة</SelectItem>
                <SelectItem value="approved">مقبول</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transfers Table */}
      <Card>
        <CardHeader>
          <CardTitle>طلبات التحويل</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الدولة</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>المرجع</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      لا توجد طلبات
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers?.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {transfer.profiles?.full_name || 'غير محدد'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {transfer.profiles?.phone || transfer.profiles?.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="font-bold">{transfer.amount}</span>
                        </div>
                        {transfer.amount_dzd && (
                          <span className="text-xs text-muted-foreground">
                            ({transfer.amount_dzd.toLocaleString()} دج)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{transfer.sender_country}</span>
                          {transfer.sender_city && (
                            <span className="text-xs text-muted-foreground">{transfer.sender_city}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getPaymentMethodLabel(transfer.payment_method)}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                          {transfer.transaction_reference || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {format(new Date(transfer.created_at), 'dd MMM yyyy', { locale: ar })}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell>
                        {transfer.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(transfer)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(transfer)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        {transfer.status !== 'pending' && (
                          <span className="text-sm text-muted-foreground">
                            {transfer.admin_notes || '-'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>الموافقة على التحويل</DialogTitle>
            <DialogDescription>
              قم بإدخال سعر الصرف لتحويل المبلغ إلى الدينار الجزائري
            </DialogDescription>
          </DialogHeader>

          {selectedTransfer && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">المستخدم:</span>
                  <span className="font-medium">{selectedTransfer.profiles?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">المبلغ:</span>
                  <span className="font-bold text-lg">${selectedTransfer.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">الدولة:</span>
                  <span>{selectedTransfer.sender_country}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="exchangeRate">سعر الصرف (1 USD = ... DZD)</Label>
                <Input
                  id="exchangeRate"
                  type="number"
                  placeholder="280"
                  value={approvalData.exchangeRate}
                  onChange={(e) => setApprovalData({ ...approvalData, exchangeRate: e.target.value })}
                  step="0.01"
                  className="mt-2"
                />
              </div>

              {approvalData.exchangeRate && (
                <div className="bg-primary/5 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">المبلغ بالدينار:</p>
                  <p className="text-2xl font-bold text-primary">
                    {(selectedTransfer.amount * parseFloat(approvalData.exchangeRate || '0')).toLocaleString()} دج
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="adminNotes">ملاحظات (اختياري)</Label>
                <Textarea
                  id="adminNotes"
                  placeholder="أي ملاحظات إضافية..."
                  value={approvalData.adminNotes}
                  onChange={(e) => setApprovalData({ ...approvalData, adminNotes: e.target.value })}
                  rows={3}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={confirmApproval}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 ml-2" />
                  تأكيد الموافقة
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض التحويل</DialogTitle>
            <DialogDescription>
              يرجى إدخال سبب رفض هذا الطلب
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">سبب الرفض *</Label>
              <Textarea
                id="rejectionReason"
                placeholder="مثال: معلومات التحويل غير مطابقة"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              إلغاء
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmRejection}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الرفض...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 ml-2" />
                  تأكيد الرفض
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiasporaTransfers;
