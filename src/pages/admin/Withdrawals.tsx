import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminWithdrawals } from '@/hooks/useAdminWithdrawals';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowUpFromLine, Search, Clock, CheckCircle, DollarSign, User, CreditCard, MapPin, X, Eye,
  Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown,
  TrendingUp, BarChart3, Banknote, RefreshCw, Copy, ChevronDown, ChevronUp
} from 'lucide-react';

type SortField = 'amount' | 'created_at' | 'fee_amount';
type SortOrder = 'asc' | 'desc';

export default function WithdrawalsPage() {
  const { 
    withdrawals, loading, stats, approveWithdrawal, rejectWithdrawal, 
    fetchWithdrawals, page, setPage, totalCount, pageSize, totalPages
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
  const [showDailyStats, setShowDailyStats] = React.useState(false);

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
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
      completed: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: <CheckCircle className="w-3 h-3" />, label: 'مكتمل' },
      pending: { className: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: <Clock className="w-3 h-3" />, label: 'معلق' },
      approved: { className: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: <CheckCircle className="w-3 h-3" />, label: 'معتمد' },
      rejected: { className: 'bg-red-500/10 text-red-600 border-red-500/20', icon: <X className="w-3 h-3" />, label: 'مرفوض' },
    };
    const c = config[status];
    if (!c) return null;
    return <Badge variant="outline" className={`gap-1 text-[11px] font-medium ${c.className}`}>{c.icon}{c.label}</Badge>;
  };

  const getMethodName = (method: string) => {
    const names: Record<string, string> = {
      opay: 'OPay', barid_bank: 'بريد الجزائر', ccp: 'CCP',
      cash: 'نقدي', merchant_transfer: 'تاجر', albaraka: 'البركة', badr: 'بدر'
    };
    return names[method] || method;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-DZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount: number) => Math.round(amount).toLocaleString('en-US').replace(/,/g, '') + ' د.ج';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ" });
  };

  const handleApprove = async (withdrawalId: string) => {
    setActionLoading(true);
    try {
      let finalNotes = approveNotes;
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `withdrawal_receipt_${withdrawalId}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('deposit-receipts').upload(fileName, receiptFile, { cacheControl: '3600', upsert: false });
        if (uploadError) throw new Error(`فشل في رفع الإيصال: ${uploadError.message}`);
        finalNotes = `تم رفع إيصال السحب: ${fileName}. ${approveNotes}`;
      }
      await approveWithdrawal(withdrawalId, finalNotes || undefined);
      setApproveNotes(''); setReceiptFile(null); setApproveDialogOpen(false);
      toast({ title: "✅ تم قبول طلب السحب" });
    } catch (error: any) {
      let errorMessage = "فشل في قبول الطلب";
      if (error?.message?.includes('balance_non_negative') || error?.code === '23514') {
        errorMessage = "رصيد المستخدم غير كافٍ لإتمام عملية السحب.";
      } else if (error?.message) errorMessage = error.message;
      toast({ title: "خطأ", description: errorMessage, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleReject = async (withdrawalId: string) => {
    if (!rejectReason.trim()) {
      toast({ title: "أدخل سبب الرفض", variant: "destructive" });
      return;
    }
    setActionLoading(true);
    try {
      await rejectWithdrawal(withdrawalId, rejectReason);
      setRejectReason(''); setRejectDialogOpen(false);
      toast({ title: "❌ تم رفض طلب السحب" });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في رفض الطلب", variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const pendingCount = stats.pendingCount;
  const statusCounts = React.useMemo(() => ({
    all: withdrawals.length,
    pending: withdrawals.filter(w => w.status === 'pending').length,
    approved: withdrawals.filter(w => w.status === 'approved').length,
    completed: withdrawals.filter(w => w.status === 'completed').length,
    rejected: withdrawals.filter(w => w.status === 'rejected').length,
  }), [withdrawals]);

  const clearFilters = () => {
    setSearchTerm(''); setSelectedStatus('all'); setSelectedMethod('all');
    setSelectedDate(''); setSortField('created_at'); setSortOrder('desc');
  };

  const hasActiveFilters = searchTerm || selectedStatus !== 'all' || selectedMethod !== 'all' || selectedDate;

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Banknote className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">إدارة السحوبات</h1>
            <p className="text-xs text-muted-foreground">{totalCount} طلب إجمالي</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge className="bg-amber-500 text-white text-xs px-2.5 py-0.5 animate-pulse">
              {pendingCount} معلق
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchWithdrawals()} disabled={loading} className="h-8 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ml-1 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowDailyStats(!showDailyStats)} className="h-8 text-xs">
            <BarChart3 className="h-3.5 w-3.5 ml-1" />
            إحصائيات
            {showDailyStats ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
          </Button>
        </div>
      </div>

      {/* Compact Stats Strip */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: 'الإجمالي', value: formatCurrency(stats.totalAmount), count: stats.totalCount, color: 'text-foreground', dotColor: 'bg-primary' },
          { label: 'مكتمل', value: formatCurrency(stats.completedAmount), count: stats.completedCount, color: 'text-emerald-600', dotColor: 'bg-emerald-500' },
          { label: 'معلق', value: formatCurrency(stats.pendingAmount), count: stats.pendingCount, color: 'text-amber-600', dotColor: 'bg-amber-500' },
          { label: 'معتمد', value: String(stats.approvedCount), count: stats.approvedCount, color: 'text-blue-600', dotColor: 'bg-blue-500' },
          { label: 'مرفوض', value: String(stats.rejectedCount), count: stats.rejectedCount, color: 'text-red-600', dotColor: 'bg-red-500' },
          { label: 'الرسوم', value: formatCurrency(stats.totalFees), count: null, color: 'text-emerald-600', dotColor: 'bg-emerald-500' },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border/40 rounded-lg px-3 py-2.5 hover:border-border/80 transition-colors">
            <div className="flex items-center gap-1.5 mb-1">
              <div className={`h-1.5 w-1.5 rounded-full ${s.dotColor}`} />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{s.label}</span>
            </div>
            <p className={`text-sm font-bold ${s.color} leading-none`}>{s.value}</p>
            {s.count !== null && <p className="text-[10px] text-muted-foreground mt-0.5">{s.count} طلب</p>}
          </div>
        ))}
      </div>

      {/* Collapsible Daily Stats */}
      {showDailyStats && stats.dailyStats && stats.dailyStats.length > 0 && (
        <Card className="border-border/40 overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-muted/30 px-4 py-2 border-b border-border/30 flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold">آخر 7 أيام</span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent text-xs">
                    <TableHead className="text-right py-2 h-8">اليوم</TableHead>
                    <TableHead className="text-center py-2 h-8">الطلبات</TableHead>
                    <TableHead className="text-center py-2 h-8">المبلغ</TableHead>
                    <TableHead className="text-center py-2 h-8 text-amber-600">معلق</TableHead>
                    <TableHead className="text-center py-2 h-8 text-emerald-600">مكتمل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.dailyStats.slice(0, 7).map((day) => (
                    <TableRow key={day.date} className="hover:bg-muted/30 text-xs">
                      <TableCell className="py-1.5 font-medium">
                        {new Date(day.date).toLocaleDateString('ar-DZ', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-center py-1.5">
                        <Badge variant="secondary" className="font-mono text-[10px] h-5">{day.totalCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center py-1.5 font-semibold">{formatCurrency(day.totalAmount)}</TableCell>
                      <TableCell className="text-center py-1.5">
                        <span className="text-amber-600 font-medium">{day.pendingCount}</span>
                        {day.pendingAmount > 0 && <span className="text-[10px] text-muted-foreground mr-1">({formatCurrency(day.pendingAmount)})</span>}
                      </TableCell>
                      <TableCell className="text-center py-1.5">
                        <span className="text-emerald-600 font-medium">{day.completedCount}</span>
                        {day.completedAmount > 0 && <span className="text-[10px] text-muted-foreground mr-1">({formatCurrency(day.completedAmount)})</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search + Filters + Status Tabs - All in one bar */}
      <div className="space-y-2">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
            <Input
              placeholder="بحث بالاسم، الهاتف، رقم الحساب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9 h-9 text-sm bg-card border-border/40"
            />
          </div>
          <div className="flex gap-2">
            <select value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}
              className="px-2.5 h-9 border border-border/40 rounded-md bg-card text-xs min-w-[100px]">
              <option value="all">كل الطرق</option>
              <option value="opay">OPay</option>
              <option value="barid_bank">بريد الجزائر</option>
              <option value="ccp">CCP</option>
              <option value="cash">نقدي</option>
              <option value="albaraka">البركة</option>
              <option value="badr">بدر</option>
            </select>
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs bg-card border-border/40 w-[140px] h-9" />
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs text-muted-foreground">
                <X className="h-3 w-3 ml-1" /> مسح
              </Button>
            )}
          </div>
        </div>

        {/* Status Tabs */}
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
          <TabsList className="h-8 bg-muted/40 p-0.5 w-full md:w-auto">
            {[
              { value: 'all', label: 'الكل' },
              { value: 'pending', label: 'معلق' },
              { value: 'approved', label: 'معتمد' },
              { value: 'completed', label: 'مكتمل' },
              { value: 'rejected', label: 'مرفوض' },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-[11px] h-7 px-3 data-[state=active]:shadow-sm gap-1.5">
                {tab.label}
                {statusCounts[tab.value as keyof typeof statusCounts] > 0 && (
                  <span className={`text-[10px] font-mono px-1 py-0 rounded ${
                    tab.value === 'pending' && statusCounts.pending > 0 
                      ? 'bg-amber-500/20 text-amber-700' 
                      : 'bg-muted-foreground/10 text-muted-foreground'
                  }`}>
                    {statusCounts[tab.value as keyof typeof statusCounts]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Main Table */}
      <Card className="border-border/40 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredAndSortedWithdrawals.length === 0 ? (
            <div className="text-center py-16">
              <ArrowUpFromLine className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">لا توجد عمليات سحب</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/20 bg-muted/20">
                    <TableHead className="text-right text-[11px] font-semibold h-9 py-0">المستخدم</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold h-9 py-0 cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                      <span className="flex items-center gap-1">المبلغ {getSortIcon('amount')}</span>
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-semibold h-9 py-0 cursor-pointer select-none" onClick={() => toggleSort('fee_amount')}>
                      <span className="flex items-center gap-1">الرسوم {getSortIcon('fee_amount')}</span>
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-semibold h-9 py-0">الطريقة</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold h-9 py-0">الحساب</TableHead>
                    <TableHead className="text-center text-[11px] font-semibold h-9 py-0">الحالة</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold h-9 py-0 cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                      <span className="flex items-center gap-1">التاريخ {getSortIcon('created_at')}</span>
                    </TableHead>
                    <TableHead className="text-center text-[11px] font-semibold h-9 py-0 w-[120px]">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedWithdrawals.map((withdrawal) => (
                    <TableRow 
                      key={withdrawal.id} 
                      className={`hover:bg-muted/30 border-border/10 transition-colors cursor-pointer ${
                        withdrawal.status === 'pending' 
                          ? 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08] border-r-2 border-r-amber-400' 
                          : ''
                      }`}
                      onClick={() => { setSelectedWithdrawal(withdrawal); setDetailsDialogOpen(true); }}
                    >
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/8 flex items-center justify-center shrink-0">
                            <User className="h-3 w-3 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-xs truncate max-w-[120px]">{withdrawal.user_profile?.full_name || 'غير محدد'}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{withdrawal.user_profile?.phone || ''}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="font-bold text-xs text-foreground">{formatCurrency(withdrawal.amount)}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        {withdrawal.fee_amount > 0 ? (
                          <span className="text-[11px] text-orange-600 font-medium">{formatCurrency(withdrawal.fee_amount)}</span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          {withdrawal.withdrawal_method === 'cash' ? <MapPin className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                          {getMethodName(withdrawal.withdrawal_method)}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        {withdrawal.withdrawal_method === 'cash' ? (
                          <span className="text-[11px] text-muted-foreground">{withdrawal.cash_location || '—'}</span>
                        ) : withdrawal.withdrawal_method === 'merchant_transfer' ? (
                          <span className="text-[11px] text-muted-foreground">تاجر</span>
                        ) : (
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-[11px] font-mono truncate max-w-[100px]">{withdrawal.account_number || '—'}</span>
                            {withdrawal.account_number && (
                              <button onClick={(e) => { e.stopPropagation(); copyToClipboard(withdrawal.account_number!); }} 
                                className="text-muted-foreground hover:text-foreground shrink-0">
                                <Copy className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-2">
                        {getStatusBadge(withdrawal.status)}
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(withdrawal.created_at)}</span>
                      </TableCell>
                      <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-0.5">
                          {withdrawal.status === 'pending' && (
                            <>
                              <Button size="sm" variant="ghost"
                                className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded-full"
                                onClick={() => { setSelectedWithdrawal(withdrawal); setApproveDialogOpen(true); }}>
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-full"
                                onClick={() => { setSelectedWithdrawal(withdrawal); setRejectDialogOpen(true); }}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-full text-muted-foreground"
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
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/20 bg-muted/10">
              <span className="text-[11px] text-muted-foreground">
                {page} / {totalPages} • {totalCount} طلب
              </span>
              <div className="flex items-center gap-0.5">
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
              موافقة على السحب
            </DialogTitle>
            <DialogDescription>
              {selectedWithdrawal && (
                <div className="mt-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">المبلغ للإرسال:</span>
                    <span className="font-bold text-emerald-600 text-base">{formatCurrency(selectedWithdrawal.amount)}</span>
                  </div>
                  {selectedWithdrawal.fee_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">الرسوم:</span>
                      <span className="text-orange-600">{formatCurrency(selectedWithdrawal.fee_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">الطريقة:</span>
                    <span>{getMethodName(selectedWithdrawal.withdrawal_method)}</span>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {selectedWithdrawal && selectedWithdrawal.withdrawal_method !== 'cash' && selectedWithdrawal.withdrawal_method !== 'merchant_transfer' && (
              <div className="bg-muted/40 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">رقم الحساب:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-sm">{selectedWithdrawal.account_number}</span>
                    <button onClick={() => copyToClipboard(selectedWithdrawal.account_number || '')} 
                      className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">الاسم:</span>
                  <span className="font-medium">{selectedWithdrawal.account_holder_name}</span>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="receipt-upload" className="text-xs">إيصال (اختياري)</Label>
              <Input id="receipt-upload" type="file" accept="image/*"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="mt-1 h-9 text-xs" />
            </div>
            <div>
              <Label htmlFor="approve-notes" className="text-xs">ملاحظات (اختياري)</Label>
              <Textarea id="approve-notes" value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)} placeholder="ملاحظات..." rows={2} className="text-sm" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={() => handleApprove(selectedWithdrawal?.id)} disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 flex-1 h-9 text-sm">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-1.5" /> تأكيد</>}
              </Button>
              <Button variant="outline" className="h-9 text-sm" onClick={() => { setApproveDialogOpen(false); setReceiptFile(null); setApproveNotes(''); }}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <X className="h-5 w-5" />
              رفض طلب السحب
            </DialogTitle>
            <DialogDescription>سيتم إرسال سبب الرفض للمستخدم</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="reject-reason" className="text-xs">سبب الرفض *</Label>
              <Textarea id="reject-reason" value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="سبب رفض الطلب..." required rows={3} className="text-sm" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={() => handleReject(selectedWithdrawal?.id)}
                disabled={actionLoading || !rejectReason.trim()} variant="destructive" className="flex-1 h-9 text-sm">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><X className="h-4 w-4 mr-1.5" /> تأكيد الرفض</>}
              </Button>
              <Button variant="outline" className="h-9 text-sm" onClick={() => { setRejectDialogOpen(false); setRejectReason(''); }}>
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
            <DialogTitle className="flex items-center gap-2 text-sm">
              تفاصيل الطلب
              {selectedWithdrawal && (
                <span className="font-mono text-[11px] text-muted-foreground">#{selectedWithdrawal.id.slice(0, 8)}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-3">
              {/* Amount highlight */}
              <div className="bg-gradient-to-l from-emerald-500/5 to-transparent border border-emerald-500/15 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">المبلغ للإرسال</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(selectedWithdrawal.amount)}</p>
                {selectedWithdrawal.fee_amount > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    الرسوم: {formatCurrency(selectedWithdrawal.fee_amount)} • الخصم: {formatCurrency(selectedWithdrawal.amount + selectedWithdrawal.fee_amount)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InfoItem label="المستخدم" value={selectedWithdrawal.user_profile?.full_name} />
                <InfoItem label="الهاتف" value={selectedWithdrawal.user_profile?.phone} mono />
                <InfoItem label="الطريقة" value={getMethodName(selectedWithdrawal.withdrawal_method)} />
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">الحالة</p>
                  {getStatusBadge(selectedWithdrawal.status)}
                </div>
              </div>

              {selectedWithdrawal.withdrawal_method !== 'cash' && selectedWithdrawal.withdrawal_method !== 'merchant_transfer' && (
                <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">رقم الحساب</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-sm">{selectedWithdrawal.account_number}</span>
                      <button onClick={() => copyToClipboard(selectedWithdrawal.account_number || '')}
                        className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">صاحب الحساب</span>
                    <span className="font-medium text-sm">{selectedWithdrawal.account_holder_name}</span>
                  </div>
                </div>
              )}

              {selectedWithdrawal.withdrawal_method === 'cash' && (
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground">موقع الاستلام</p>
                  <p className="font-medium text-sm mt-0.5">{selectedWithdrawal.cash_location}</p>
                </div>
              )}

              <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-border/20">
                <span>الطلب: {formatDate(selectedWithdrawal.created_at)}</span>
                {selectedWithdrawal.processed_at && <span>المعالجة: {formatDate(selectedWithdrawal.processed_at)}</span>}
              </div>

              {selectedWithdrawal.notes && (
                <div className="bg-blue-500/5 border border-blue-500/15 rounded-lg p-2.5">
                  <p className="text-[10px] text-blue-600 font-medium mb-0.5">ملاحظة المستخدم</p>
                  <p className="text-xs">{selectedWithdrawal.notes}</p>
                </div>
              )}

              {selectedWithdrawal.admin_notes && (
                <div className="bg-muted/40 border rounded-lg p-2.5">
                  <p className="text-[10px] text-muted-foreground font-medium mb-0.5">ملاحظات الإدارة</p>
                  <p className="text-xs">{selectedWithdrawal.admin_notes}</p>
                </div>
              )}

              {/* Quick actions in details */}
              {selectedWithdrawal.status === 'pending' && (
                <div className="flex gap-2 pt-2 border-t border-border/20">
                  <Button className="flex-1 h-9 text-sm bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => { setDetailsDialogOpen(false); setApproveDialogOpen(true); }}>
                    <CheckCircle className="h-4 w-4 mr-1.5" /> قبول
                  </Button>
                  <Button variant="destructive" className="flex-1 h-9 text-sm"
                    onClick={() => { setDetailsDialogOpen(false); setRejectDialogOpen(true); }}>
                    <X className="h-4 w-4 mr-1.5" /> رفض
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`font-medium text-sm ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );
}
