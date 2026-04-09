import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminWithdrawals } from '@/hooks/useAdminWithdrawals';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowUpFromLine, 
  Search, 
  Clock,
  CheckCircle,
  DollarSign,
  User,
  CreditCard,
  MapPin,
  X,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  BarChart3,
  Banknote,
  FileText,
  RefreshCw,
  Filter,
  Copy
} from 'lucide-react';

type SortField = 'amount' | 'created_at' | 'fee_amount';
type SortOrder = 'asc' | 'desc';

export default function WithdrawalsPage() {
  const { 
    withdrawals, 
    loading, 
    stats,
    approveWithdrawal, 
    rejectWithdrawal, 
    fetchWithdrawals,
    page,
    setPage,
    totalCount,
    pageSize,
    totalPages
  } = useAdminWithdrawals();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('all');
  const [selectedWithdrawal, setSelectedWithdrawal] = React.useState<any>(null);
  const [rejectReason, setRejectReason] = React.useState('');
  const [approveNotes, setApproveNotes] = React.useState('');
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = React.useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false);
  
  const [sortField, setSortField] = React.useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc');
  const [selectedDate, setSelectedDate] = React.useState<string>('');
  const [selectedMethod, setSelectedMethod] = React.useState<string>('all');

  React.useEffect(() => {
    if (searchTerm.trim()) {
      fetchWithdrawals(true);
    } else {
      fetchWithdrawals(false);
    }
  }, [searchTerm, page]);

  const filteredAndSortedWithdrawals = React.useMemo(() => {
    let result = withdrawals.filter(withdrawal => {
      const query = searchTerm.trim().toLowerCase();
      
      if (selectedDate) {
        const withdrawalDate = new Date(withdrawal.created_at).toISOString().split('T')[0];
        if (withdrawalDate !== selectedDate) return false;
      }
      
      if (selectedMethod !== 'all' && withdrawal.withdrawal_method !== selectedMethod) return false;
      if (selectedStatus !== 'all' && withdrawal.status !== selectedStatus) return false;
      
      if (query) {
        const matchesSearch = 
          withdrawal.user_profile?.full_name?.toLowerCase().includes(query) ||
          withdrawal.id.toLowerCase().includes(query) ||
          withdrawal.user_profile?.phone?.replace(/\s/g, '').includes(query.replace(/\s/g, '')) ||
          withdrawal.account_number?.toLowerCase().includes(query) ||
          withdrawal.account_holder_name?.toLowerCase().includes(query) ||
          withdrawal.cash_location?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      return true;
    });
    
    result.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case 'amount': aVal = a.amount; bVal = b.amount; break;
        case 'fee_amount': aVal = a.fee_amount || 0; bVal = b.fee_amount || 0; break;
        default: aVal = new Date(a.created_at).getTime(); bVal = new Date(b.created_at).getTime(); break;
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return result;
  }, [withdrawals, searchTerm, selectedStatus, selectedDate, selectedMethod, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> 
      : <ArrowDown className="h-3.5 w-3.5 text-primary" />;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
      completed: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20', icon: <CheckCircle className="w-3 h-3" />, label: 'مكتمل' },
      pending: { className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20', icon: <Clock className="w-3 h-3" />, label: 'قيد الانتظار' },
      approved: { className: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20', icon: <CheckCircle className="w-3 h-3" />, label: 'معتمد' },
      rejected: { className: 'bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20', icon: <X className="w-3 h-3" />, label: 'مرفوض' },
    };
    const c = config[status];
    if (!c) return null;
    return (
      <Badge variant="outline" className={`gap-1 font-medium ${c.className}`}>
        {c.icon}
        {c.label}
      </Badge>
    );
  };

  const getMethodName = (method: string) => {
    const names: Record<string, string> = {
      opay: 'OPay', barid_bank: 'بريد الجزائر', ccp: 'CCP',
      cash: 'سحب نقدي', merchant_transfer: 'تحويل تاجر', albaraka: 'البركة', badr: 'بدر'
    };
    return names[method] || method;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-DZ', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return Math.round(amount).toLocaleString('en-US').replace(/,/g, '') + ' د.ج';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: "تم نسخ البيانات بنجاح" });
  };

  const handleApprove = async (withdrawalId: string) => {
    setActionLoading(true);
    try {
      let finalNotes = approveNotes;
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `withdrawal_receipt_${withdrawalId}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('deposit-receipts')
          .upload(fileName, receiptFile, { cacheControl: '3600', upsert: false });
        if (uploadError) throw new Error(`فشل في رفع الإيصال: ${uploadError.message}`);
        finalNotes = `تم رفع إيصال السحب: ${fileName}. ${approveNotes}`;
      }
      await approveWithdrawal(withdrawalId, finalNotes || undefined);
      setApproveNotes(''); setReceiptFile(null); setApproveDialogOpen(false);
      toast({ title: "تم قبول طلب السحب", description: receiptFile ? "تم رفع إيصال السحب بنجاح" : "تم قبول الطلب بنجاح" });
    } catch (error: any) {
      let errorMessage = "فشل في قبول الطلب";
      if (error?.message?.includes('balance_non_negative') || error?.code === '23514') {
        errorMessage = "رصيد المستخدم غير كافٍ لإتمام عملية السحب.";
      } else if (error?.message) errorMessage = error.message;
      toast({ title: "خطأ في قبول السحب", description: errorMessage, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleReject = async (withdrawalId: string) => {
    if (!rejectReason.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال سبب الرفض", variant: "destructive" });
      return;
    }
    setActionLoading(true);
    try {
      await rejectWithdrawal(withdrawalId, rejectReason);
      setRejectReason(''); setRejectDialogOpen(false);
      toast({ title: "تم رفض طلب السحب", description: "تم إرسال سبب الرفض للمستخدم" });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في رفض الطلب", variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const pendingCount = filteredAndSortedWithdrawals.filter(w => w.status === 'pending').length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Banknote className="h-4 w-4 text-primary" />
            </div>
            إدارة عمليات السحب
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            مراقبة ومعالجة جميع طلبات السحب
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge className="bg-amber-500 text-white text-sm px-3 py-1 animate-pulse">
              {pendingCount} طلب معلق
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchWithdrawals()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-1 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'إجمالي الطلبات', value: formatCurrency(stats.totalAmount), sub: `${stats.totalCount} طلب`, icon: <TrendingUp className="h-4 w-4" />, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
          { label: 'المكتملة', value: formatCurrency(stats.completedAmount), sub: `${stats.completedCount} عملية`, icon: <CheckCircle className="h-4 w-4" />, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
          { label: 'قيد الانتظار', value: String(stats.pendingCount), sub: 'تحتاج معالجة', icon: <Clock className="h-4 w-4" />, color: 'text-amber-600', bg: 'bg-amber-500/10' },
          { label: 'معتمدة', value: String(stats.approvedCount), sub: 'في المعالجة', icon: <CheckCircle className="h-4 w-4" />, color: 'text-blue-600', bg: 'bg-blue-500/10' },
          { label: 'مرفوضة', value: String(stats.rejectedCount), sub: 'تم رفضها', icon: <X className="h-4 w-4" />, color: 'text-red-600', bg: 'bg-red-500/10' },
          { label: 'أرباح الرسوم', value: formatCurrency(stats.totalFees), sub: 'من المكتملة', icon: <DollarSign className="h-4 w-4" />, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
        ].map((stat, i) => (
          <Card key={i} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                <div className={`h-7 w-7 rounded-md ${stat.bg} flex items-center justify-center ${stat.color}`}>
                  {stat.icon}
                </div>
              </div>
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily Stats */}
      {stats.dailyStats && stats.dailyStats.length > 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              إحصائيات آخر 7 أيام
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-right font-semibold">اليوم</TableHead>
                    <TableHead className="text-center font-semibold">الطلبات</TableHead>
                    <TableHead className="text-center font-semibold">المبلغ</TableHead>
                    <TableHead className="text-center font-semibold">
                      <span className="text-amber-600">معلقة</span>
                    </TableHead>
                    <TableHead className="text-center font-semibold">
                      <span className="text-emerald-600">مكتملة</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.dailyStats.slice(0, 7).map((day) => (
                    <TableRow key={day.date} className="hover:bg-muted/40">
                      <TableCell className="font-medium text-sm">
                        {new Date(day.date).toLocaleDateString('ar-DZ', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono">{day.totalCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-sm">{formatCurrency(day.totalAmount)}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-amber-600 font-medium">{day.pendingCount}</span>
                        {day.pendingAmount > 0 && (
                          <span className="text-xs text-muted-foreground mr-1">({formatCurrency(day.pendingAmount)})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-emerald-600 font-medium">{day.completedCount}</span>
                        {day.completedAmount > 0 && (
                          <span className="text-xs text-muted-foreground mr-1">({formatCurrency(day.completedAmount)})</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters & Search */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="بحث بالاسم، رقم الهاتف، رقم الحساب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 bg-muted/30 border-border/50"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-border/50 rounded-md bg-muted/30 text-sm min-w-[120px]">
                <option value="all">كل الحالات</option>
                <option value="pending">قيد الانتظار</option>
                <option value="approved">معتمد</option>
                <option value="completed">مكتمل</option>
                <option value="rejected">مرفوض</option>
              </select>
              <select value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}
                className="px-3 py-2 border border-border/50 rounded-md bg-muted/30 text-sm min-w-[120px]">
                <option value="all">كل الطرق</option>
                <option value="opay">OPay</option>
                <option value="barid_bank">بريد الجزائر</option>
                <option value="ccp">CCP</option>
                <option value="cash">سحب نقدي</option>
              </select>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm bg-muted/30 border-border/50 w-[150px]" />
              {(searchTerm || selectedStatus !== 'all' || selectedMethod !== 'all' || selectedDate) && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setSearchTerm(''); setSelectedStatus('all'); setSelectedMethod('all');
                  setSelectedDate(''); setSortField('created_at'); setSortOrder('desc');
                }}>
                  <X className="h-4 w-4 ml-1" /> مسح
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawals Table */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              سجل السحوبات
              <Badge variant="secondary" className="font-mono text-xs">{filteredAndSortedWithdrawals.length}</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredAndSortedWithdrawals.length === 0 ? (
            <div className="text-center py-12">
              <ArrowUpFromLine className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">لا توجد عمليات سحب مطابقة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/30">
                    <TableHead className="text-right font-semibold">المستخدم</TableHead>
                    <TableHead className="text-right font-semibold cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                      <span className="flex items-center gap-1">المبلغ {getSortIcon('amount')}</span>
                    </TableHead>
                    <TableHead className="text-right font-semibold cursor-pointer select-none" onClick={() => toggleSort('fee_amount')}>
                      <span className="flex items-center gap-1">الرسوم {getSortIcon('fee_amount')}</span>
                    </TableHead>
                    <TableHead className="text-right font-semibold">الطريقة</TableHead>
                    <TableHead className="text-right font-semibold">بيانات الحساب</TableHead>
                    <TableHead className="text-center font-semibold">الحالة</TableHead>
                    <TableHead className="text-right font-semibold cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                      <span className="flex items-center gap-1">التاريخ {getSortIcon('created_at')}</span>
                    </TableHead>
                    <TableHead className="text-center font-semibold">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedWithdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id} className={`hover:bg-muted/30 border-border/20 ${withdrawal.status === 'pending' ? 'bg-amber-500/[0.03]' : ''}`}>
                      {/* User */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{withdrawal.user_profile?.full_name || 'غير محدد'}</p>
                            <p className="text-xs text-muted-foreground">{withdrawal.user_profile?.phone || ''}</p>
                          </div>
                        </div>
                      </TableCell>
                      {/* Amount */}
                      <TableCell>
                        <span className="font-bold text-sm text-foreground">{formatCurrency(withdrawal.amount)}</span>
                      </TableCell>
                      {/* Fee */}
                      <TableCell>
                        {withdrawal.fee_amount > 0 ? (
                          <div>
                            <span className="text-xs text-orange-600 font-medium">{formatCurrency(withdrawal.fee_amount)}</span>
                            <p className="text-[10px] text-muted-foreground">خصم: {formatCurrency(withdrawal.amount + withdrawal.fee_amount)}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {/* Method */}
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal gap-1">
                          {withdrawal.withdrawal_method === 'cash' ? <MapPin className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                          {getMethodName(withdrawal.withdrawal_method)}
                        </Badge>
                      </TableCell>
                      {/* Account Info */}
                      <TableCell>
                        {withdrawal.withdrawal_method === 'cash' ? (
                          <span className="text-xs text-muted-foreground">{withdrawal.cash_location || '—'}</span>
                        ) : withdrawal.withdrawal_method === 'merchant_transfer' ? (
                          <span className="text-xs text-muted-foreground">تحويل تاجر</span>
                        ) : (
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-mono truncate max-w-[140px]">{withdrawal.account_number || '—'}</p>
                              {withdrawal.account_number && (
                                <button onClick={() => copyToClipboard(withdrawal.account_number!)} className="text-muted-foreground hover:text-foreground">
                                  <Copy className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">{withdrawal.account_holder_name || ''}</p>
                          </div>
                        )}
                      </TableCell>
                      {/* Status */}
                      <TableCell className="text-center">
                        {getStatusBadge(withdrawal.status)}
                      </TableCell>
                      {/* Date */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{formatDate(withdrawal.created_at)}</span>
                      </TableCell>
                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {withdrawal.status === 'pending' && (
                            <>
                              <Button size="sm" variant="ghost"
                                className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                onClick={() => { setSelectedWithdrawal(withdrawal); setApproveDialogOpen(true); }}>
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost"
                                className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                onClick={() => { setSelectedWithdrawal(withdrawal); setRejectDialogOpen(true); }}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 px-2"
                            onClick={() => { setSelectedWithdrawal(withdrawal); setDetailsDialogOpen(true); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!searchTerm.trim() && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
              <span className="text-xs text-muted-foreground">
                صفحة {page} من {totalPages} ({totalCount} طلب)
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(1)} disabled={page === 1 || loading}>
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(page - 1)} disabled={page === 1 || loading}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (page <= 3) pageNum = i + 1;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = page - 2 + i;
                  return (
                    <Button key={pageNum} variant={page === pageNum ? "default" : "ghost"} size="sm"
                      className="h-7 w-7 p-0 text-xs" onClick={() => setPage(pageNum)} disabled={loading}>
                      {pageNum}
                    </Button>
                  );
                })}
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(page + 1)} disabled={page === totalPages || loading}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(totalPages)} disabled={page === totalPages || loading}>
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>موافقة على طلب السحب</DialogTitle>
            <DialogDescription>
              {selectedWithdrawal && (
                <span className="block mt-2 text-foreground font-semibold">
                  المبلغ للإرسال: {formatCurrency(selectedWithdrawal.amount)}
                  {selectedWithdrawal.fee_amount > 0 && ` • الرسوم: ${formatCurrency(selectedWithdrawal.fee_amount)}`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedWithdrawal && selectedWithdrawal.withdrawal_method !== 'cash' && selectedWithdrawal.withdrawal_method !== 'merchant_transfer' && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">رقم الحساب:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-medium">{selectedWithdrawal.account_number}</span>
                    <button onClick={() => copyToClipboard(selectedWithdrawal.account_number || '')} className="text-muted-foreground hover:text-foreground">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">اسم الحساب:</span>
                  <span className="font-medium">{selectedWithdrawal.account_holder_name}</span>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="receipt-upload">صورة الإيصال (اختياري)</Label>
              <Input id="receipt-upload" type="file" accept="image/*"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="approve-notes">ملاحظات (اختياري)</Label>
              <Textarea id="approve-notes" value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)} placeholder="ملاحظات إضافية..." />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleApprove(selectedWithdrawal?.id)} disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 flex-1">
                {actionLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> جاري المعالجة...</> 
                  : <><CheckCircle className="h-4 w-4 mr-2" /> تأكيد الموافقة</>}
              </Button>
              <Button variant="outline" onClick={() => { setApproveDialogOpen(false); setReceiptFile(null); setApproveNotes(''); }}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض طلب السحب</DialogTitle>
            <DialogDescription>سيتم إرسال سبب الرفض للمستخدم</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">سبب الرفض *</Label>
              <Textarea id="reject-reason" value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="اذكر سبب رفض الطلب..." required rows={4} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleReject(selectedWithdrawal?.id)}
                disabled={actionLoading || !rejectReason.trim()} variant="destructive" className="flex-1">
                {actionLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> جاري الرفض...</>
                  : <><X className="h-4 w-4 mr-2" /> تأكيد الرفض</>}
              </Button>
              <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectReason(''); }}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              تفاصيل طلب السحب
            </DialogTitle>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">المستخدم</Label>
                  <p className="font-medium text-sm">{selectedWithdrawal.user_profile?.full_name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">الهاتف</Label>
                  <p className="font-medium text-sm">{selectedWithdrawal.user_profile?.phone}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">المبلغ للإرسال</Label>
                  <p className="font-bold text-lg text-emerald-600">{formatCurrency(selectedWithdrawal.amount)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">الرسوم</Label>
                  <p className="font-medium text-sm text-orange-600">
                    {selectedWithdrawal.fee_amount > 0 ? formatCurrency(selectedWithdrawal.fee_amount) : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">طريقة السحب</Label>
                  <p className="font-medium text-sm">{getMethodName(selectedWithdrawal.withdrawal_method)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">الحالة</Label>
                  {getStatusBadge(selectedWithdrawal.status)}
                </div>
              </div>
              
              {selectedWithdrawal.withdrawal_method !== 'cash' && selectedWithdrawal.withdrawal_method !== 'merchant_transfer' && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <Label className="text-xs text-muted-foreground">بيانات الحساب</Label>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">رقم الحساب:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-medium text-sm">{selectedWithdrawal.account_number}</span>
                      <button onClick={() => copyToClipboard(selectedWithdrawal.account_number || '')}
                        className="text-muted-foreground hover:text-foreground">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">صاحب الحساب:</span>
                    <span className="font-medium text-sm">{selectedWithdrawal.account_holder_name}</span>
                  </div>
                </div>
              )}
              
              {selectedWithdrawal.withdrawal_method === 'cash' && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <Label className="text-xs text-muted-foreground">موقع الاستلام</Label>
                  <p className="font-medium text-sm mt-1">{selectedWithdrawal.cash_location}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <p>تاريخ الطلب: {formatDate(selectedWithdrawal.created_at)}</p>
                {selectedWithdrawal.processed_at && <p>تاريخ المعالجة: {formatDate(selectedWithdrawal.processed_at)}</p>}
                <p className="font-mono">#{selectedWithdrawal.id.slice(0, 12)}</p>
              </div>

              {selectedWithdrawal.notes && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                  <Label className="text-xs text-blue-600">ملاحظة المستخدم</Label>
                  <p className="text-sm mt-1">{selectedWithdrawal.notes}</p>
                </div>
              )}
              
              {selectedWithdrawal.admin_notes && (
                <div className="bg-muted/50 border rounded-lg p-3">
                  <Label className="text-xs text-muted-foreground">ملاحظات الإدارة</Label>
                  <p className="text-sm mt-1">{selectedWithdrawal.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
