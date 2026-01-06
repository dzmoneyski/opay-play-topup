import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAdminWithdrawals } from '@/hooks/useAdminWithdrawals';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowUpFromLine, 
  Search, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  User,
  CreditCard,
  MapPin,
  X,
  Eye,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  BarChart3
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
  
  // فلترة وترتيب جديد
  const [sortField, setSortField] = React.useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc');
  const [selectedDate, setSelectedDate] = React.useState<string>('');
  const [selectedMethod, setSelectedMethod] = React.useState<string>('all');

  // جلب جميع البيانات عند البحث
  React.useEffect(() => {
    if (searchTerm.trim()) {
      fetchWithdrawals(true); // جلب الكل
    } else {
      fetchWithdrawals(false); // جلب مع التصفح
    }
  }, [searchTerm, page]);

  // حساب الإحصائيات اليومية
  const dailyStats = React.useMemo(() => {
    const stats: Record<string, { 
      pending: number; 
      pendingCount: number;
      completed: number; 
      completedCount: number;
      rejected: number;
      rejectedCount: number;
      fees: number;
    }> = {};
    
    withdrawals.forEach(w => {
      const date = new Date(w.created_at).toISOString().split('T')[0];
      if (!stats[date]) {
        stats[date] = { pending: 0, pendingCount: 0, completed: 0, completedCount: 0, rejected: 0, rejectedCount: 0, fees: 0 };
      }
      
      if (w.status === 'pending' || w.status === 'approved') {
        stats[date].pending += w.amount;
        stats[date].pendingCount++;
      } else if (w.status === 'completed') {
        stats[date].completed += w.amount;
        stats[date].completedCount++;
        stats[date].fees += w.fee_amount || 0;
      } else if (w.status === 'rejected') {
        stats[date].rejected += w.amount;
        stats[date].rejectedCount++;
      }
    });
    
    return stats;
  }, [withdrawals]);

  // الفلترة والترتيب
  const filteredAndSortedWithdrawals = React.useMemo(() => {
    let result = withdrawals.filter(withdrawal => {
      const query = searchTerm.trim().toLowerCase();
      
      // فلتر التاريخ
      if (selectedDate) {
        const withdrawalDate = new Date(withdrawal.created_at).toISOString().split('T')[0];
        if (withdrawalDate !== selectedDate) return false;
      }
      
      // فلتر طريقة السحب
      if (selectedMethod !== 'all' && withdrawal.withdrawal_method !== selectedMethod) {
        return false;
      }
      
      // فلتر الحالة
      if (selectedStatus !== 'all' && withdrawal.status !== selectedStatus) {
        return false;
      }
      
      // البحث النصي
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
    
    // الترتيب
    result.sort((a, b) => {
      let aVal: number, bVal: number;
      
      switch (sortField) {
        case 'amount':
          aVal = a.amount;
          bVal = b.amount;
          break;
        case 'fee_amount':
          aVal = a.fee_amount || 0;
          bVal = b.fee_amount || 0;
          break;
        case 'created_at':
        default:
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
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
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-primary" /> 
      : <ArrowDown className="h-4 w-4 text-primary" />;
  };

  // إحصائيات التاريخ المحدد
  const selectedDateStats = selectedDate ? dailyStats[selectedDate] : null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            مكتمل
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            قيد الانتظار
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            معتمد
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <X className="w-3 h-3 mr-1" />
            مرفوض
          </Badge>
        );
      default:
        return null;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <MapPin className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getMethodName = (method: string) => {
    switch (method) {
      case 'opay':
        return 'OPay';
      case 'barid_bank':
        return 'بريد الجزائر';
      case 'ccp':
        return 'CCP';
      case 'cash':
        return 'سحب نقدي';
      case 'merchant_transfer':
        return 'تحويل تاجر';
      default:
        return method;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleApprove = async (withdrawalId: string) => {
    setActionLoading(true);
    try {
      let finalNotes = approveNotes;
      
      // Upload receipt if provided (optional)
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `withdrawal_receipt_${withdrawalId}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('deposit-receipts')
          .upload(fileName, receiptFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`فشل في رفع الإيصال: ${uploadError.message}`);
        }
        
        finalNotes = `تم رفع إيصال السحب: ${fileName}. ${approveNotes}`;
      }

      // Approve withdrawal
      await approveWithdrawal(withdrawalId, finalNotes || undefined);
      
      // Reset form
      setApproveNotes('');
      setReceiptFile(null);
      setApproveDialogOpen(false);
      
      toast({
        title: "تم قبول طلب السحب",
        description: receiptFile ? "تم رفع إيصال السحب بنجاح" : "تم قبول الطلب بنجاح"
      });
    } catch (error: any) {
      console.error('Error approving withdrawal:', error);
      let errorMessage = "فشل في قبول الطلب";
      
      // Check for specific error types
      if (error?.message?.includes('balance_non_negative') || error?.code === '23514') {
        errorMessage = "رصيد المستخدم غير كافٍ لإتمام عملية السحب. يرجى التحقق من رصيده الفعلي.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "خطأ في قبول السحب",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (withdrawalId: string) => {
    if (!rejectReason.trim()) {
      toast({
        title: "خطأ", 
        description: "يرجى إدخال سبب الرفض",
        variant: "destructive"
      });
      return;
    }
    setActionLoading(true);
    try {
      await rejectWithdrawal(withdrawalId, rejectReason);
      setRejectReason('');
      setRejectDialogOpen(false);
      
      toast({
        title: "تم رفض طلب السحب",
        description: "تم إرسال سبب الرفض للمستخدم"
      });
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      toast({
        title: "خطأ",
        description: "فشل في رفض الطلب",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">إدارة عمليات السحب</h1>
        <p className="text-muted-foreground mt-2">
          مراقبة وإدارة جميع عمليات سحب الأموال في المنصة
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {formatCurrency(stats.totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground">{stats.totalCount} طلب</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المكتملة</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.completedAmount)}
            </div>
            <p className="text-xs text-muted-foreground">{stats.completedCount} عملية</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد الانتظار</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground">تحتاج معالجة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معتمدة</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.approvedCount}</div>
            <p className="text-xs text-muted-foreground">في المعالجة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مرفوضة</CardTitle>
            <X className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejectedCount}</div>
            <p className="text-xs text-muted-foreground">تم رفضها</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">أرباح الرسوم</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalFees)}</div>
            <p className="text-xs text-muted-foreground">من المكتملة</p>
          </CardContent>
        </Card>
      </div>

      {/* إحصائيات اليوم المحدد */}
      {selectedDateStats && (
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              إحصائيات يوم {new Date(selectedDate).toLocaleDateString('ar-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">معلقة</div>
                <div className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{formatCurrency(selectedDateStats.pending)}</div>
                <div className="text-xs text-yellow-600/70">{selectedDateStats.pendingCount} طلب</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-green-600 dark:text-green-400 text-sm font-medium">مكتملة</div>
                <div className="text-xl font-bold text-green-700 dark:text-green-300">{formatCurrency(selectedDateStats.completed)}</div>
                <div className="text-xs text-green-600/70">{selectedDateStats.completedCount} طلب</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                <div className="text-red-600 dark:text-red-400 text-sm font-medium">مرفوضة</div>
                <div className="text-xl font-bold text-red-700 dark:text-red-300">{formatCurrency(selectedDateStats.rejected)}</div>
                <div className="text-xs text-red-600/70">{selectedDateStats.rejectedCount} طلب</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-blue-600 dark:text-blue-400 text-sm font-medium">أرباح الرسوم</div>
                <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(selectedDateStats.fees)}</div>
                <div className="text-xs text-blue-600/70">من المكتملة</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            البحث والتصفية المتقدمة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* الصف الأول: البحث */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="البحث بالاسم، معرف الطلب، رقم الهاتف، أو رقم الحساب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          
          {/* الصف الثاني: الفلاتر */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* فلتر الحالة */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">الحالة</Label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              >
                <option value="all">جميع الحالات</option>
                <option value="pending">قيد الانتظار</option>
                <option value="approved">معتمد</option>
                <option value="completed">مكتمل</option>
                <option value="rejected">مرفوض</option>
              </select>
            </div>
            
            {/* فلتر طريقة السحب */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">طريقة السحب</Label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              >
                <option value="all">جميع الطرق</option>
                <option value="opay">OPay</option>
                <option value="barid_bank">بريد الجزائر</option>
                <option value="ccp">CCP</option>
                <option value="cash">سحب نقدي</option>
              </select>
            </div>
            
            {/* فلتر التاريخ */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">التاريخ</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm"
              />
            </div>
            
            {/* زر المسح */}
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('all');
                  setSelectedMethod('all');
                  setSelectedDate('');
                  setSortField('created_at');
                  setSortOrder('desc');
                }}
                className="w-full"
              >
                <X className="h-4 w-4 ml-1" />
                مسح الفلاتر
              </Button>
            </div>
          </div>
          
          {/* الصف الثالث: أزرار الترتيب */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <span className="text-sm text-muted-foreground self-center ml-2">ترتيب حسب:</span>
            <Button
              variant={sortField === 'created_at' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSort('created_at')}
              className="gap-1"
            >
              التاريخ
              {getSortIcon('created_at')}
            </Button>
            <Button
              variant={sortField === 'amount' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSort('amount')}
              className="gap-1"
            >
              المبلغ
              {getSortIcon('amount')}
            </Button>
            <Button
              variant={sortField === 'fee_amount' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSort('fee_amount')}
              className="gap-1"
            >
              الرسوم
              {getSortIcon('fee_amount')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>سجل عمليات السحب ({filteredAndSortedWithdrawals.length})</span>
            <Badge variant="outline" className="font-normal">
              إجمالي الرسوم: {formatCurrency(stats.totalFees)}
            </Badge>
          </CardTitle>
          <CardDescription>
            عرض تفصيلي لجميع طلبات السحب وحالتها • مرتب حسب {sortField === 'amount' ? 'المبلغ' : sortField === 'fee_amount' ? 'الرسوم' : 'التاريخ'} ({sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedWithdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 bg-gradient-secondary rounded-full flex items-center justify-center text-white">
                          <ArrowUpFromLine className="h-5 w-5" />
                        </div>
                        <div>
                          {/* عرض المبلغ للإرسال بوضوح */}
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground text-lg">
                              💰 للإرسال: {formatCurrency(withdrawal.amount)}
                            </h3>
                          </div>
                          {/* عرض الرسوم إن وجدت */}
                          {(withdrawal.fee_amount > 0) && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-orange-600 font-medium">
                                الرسوم: {formatCurrency(withdrawal.fee_amount)}
                              </span>
                              <span className="text-muted-foreground">|</span>
                              <span className="text-blue-600 font-medium">
                                إجمالي الخصم: {formatCurrency(withdrawal.amount + withdrawal.fee_amount)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {withdrawal.user_profile?.full_name || 'غير محدد'}
                            </span>
                            <span>•</span>
                            <span>#{withdrawal.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1">
                          {getMethodIcon(withdrawal.withdrawal_method)}
                          <span className="text-muted-foreground">الطريقة: </span>
                          <span className="font-medium text-foreground">
                            {getMethodName(withdrawal.withdrawal_method)}
                          </span>
                        </div>
                        
                        {withdrawal.withdrawal_method === 'cash' ? (
                          <div>
                            <span className="text-muted-foreground">موقع الاستلام: </span>
                            <span className="font-medium text-foreground">{withdrawal.cash_location}</span>
                          </div>
                        ) : withdrawal.withdrawal_method === 'merchant_transfer' ? (
                          <div>
                            <span className="text-muted-foreground">النوع: </span>
                            <span className="font-medium text-foreground">تحويل من رصيد التاجر</span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-muted-foreground">الحساب: </span>
                            <span className="font-medium text-foreground">
                              {withdrawal.account_holder_name || 'غير محدد'} - {withdrawal.account_number || 'غير محدد'}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-muted-foreground">تاريخ الطلب: </span>
                            <span className="font-medium text-foreground">
                              {formatDate(withdrawal.created_at)}
                            </span>
                          </div>
                          {withdrawal.processed_at && (
                            <div>
                              <span className="text-muted-foreground">تاريخ المعالجة: </span>
                              <span className="font-medium text-foreground">
                                {formatDate(withdrawal.processed_at)}
                              </span>
                            </div>
                          )}
                        </div>

                        {withdrawal.status === 'rejected' && withdrawal.admin_notes && (
                          <div className="p-2 bg-red-50 border border-red-200 rounded text-red-800 text-xs">
                            <strong>سبب الرفض:</strong> {withdrawal.admin_notes}
                          </div>
                        )}

                        {withdrawal.notes && (
                          <div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs">
                            <strong>ملاحظة المستخدم:</strong> {withdrawal.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getStatusBadge(withdrawal.status)}
                      
                      {withdrawal.status === 'pending' && (
                        <div className="flex gap-1">
                          <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  setSelectedWithdrawal(withdrawal);
                                  setApproveDialogOpen(true);
                                }}
                              >
                                موافقة
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>موافقة على طلب السحب</DialogTitle>
                                <DialogDescription>
                                  هل أنت متأكد من الموافقة على هذا الطلب؟
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="receipt-upload">صورة إيصال السحب (اختياري)</Label>
                                  <Input
                                    id="receipt-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                                    className="mt-1"
                                  />
                                  <p className="text-sm text-muted-foreground mt-1">
                                    يمكنك رفع صورة الإيصال إن وجدت
                                  </p>
                                </div>
                                <div>
                                  <Label htmlFor="approve-notes">ملاحظات إضافية (اختياري)</Label>
                                  <Textarea
                                    id="approve-notes"
                                    value={approveNotes}
                                    onChange={(e) => setApproveNotes(e.target.value)}
                                    placeholder="أي ملاحظات للمستخدم..."
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    onClick={() => handleApprove(selectedWithdrawal?.id)}
                                    disabled={actionLoading}
                                    className="bg-green-600 hover:bg-green-700 flex-1"
                                  >
                                    {actionLoading ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        جاري المعالجة...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        تأكيد الموافقة
                                      </>
                                    )}
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setApproveDialogOpen(false);
                                      setReceiptFile(null);
                                      setApproveNotes('');
                                    }}
                                    className="flex-1"
                                  >
                                    إلغاء
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => {
                                  setSelectedWithdrawal(withdrawal);
                                  setRejectDialogOpen(true);
                                }}
                              >
                                رفض
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>رفض طلب السحب</DialogTitle>
                                <DialogDescription>
                                  يرجى إدخال سبب رفض هذا الطلب بوضوح
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="reject-reason">سبب الرفض *</Label>
                                  <Textarea
                                    id="reject-reason"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="اذكر سبب رفض الطلب بالتفصيل..."
                                    required
                                    rows={4}
                                  />
                                  <p className="text-sm text-muted-foreground mt-1">
                                    سيتم إرسال هذا السبب للمستخدم
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    onClick={() => handleReject(selectedWithdrawal?.id)}
                                    disabled={actionLoading || !rejectReason.trim()}
                                    variant="destructive"
                                    className="flex-1"
                                  >
                                    {actionLoading ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        جاري الرفض...
                                      </>
                                    ) : (
                                      <>
                                        <X className="h-4 w-4 mr-2" />
                                        تأكيد الرفض
                                      </>
                                    )}
                                  </Button>
                                  <Button 
                                    variant="outline"
                                    onClick={() => {
                                      setRejectDialogOpen(false);
                                      setRejectReason('');
                                    }}
                                    className="flex-1"
                                  >
                                    إلغاء
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            التفاصيل
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>تفاصيل طلب السحب</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>اسم المستخدم</Label>
                                <p className="font-medium">{withdrawal.user_profile?.full_name}</p>
                              </div>
                              <div>
                                <Label>رقم الهاتف</Label>
                                <p className="font-medium">{withdrawal.user_profile?.phone}</p>
                              </div>
                              <div>
                                <Label>المبلغ</Label>
                                <p className="font-medium">{formatCurrency(withdrawal.amount)}</p>
                              </div>
                              <div>
                                <Label>طريقة السحب</Label>
                                <p className="font-medium">{getMethodName(withdrawal.withdrawal_method)}</p>
                              </div>
                            </div>
                            
                            {withdrawal.withdrawal_method !== 'cash' && (
                              <div className="space-y-2">
                                <Label>بيانات الحساب</Label>
                                <p><strong>رقم الحساب:</strong> {withdrawal.account_number}</p>
                                <p><strong>اسم صاحب الحساب:</strong> {withdrawal.account_holder_name}</p>
                              </div>
                            )}
                            
                            {withdrawal.withdrawal_method === 'cash' && (
                              <div>
                                <Label>موقع الاستلام</Label>
                                <p className="font-medium">{withdrawal.cash_location}</p>
                              </div>
                            )}
                            
                            {withdrawal.notes && (
                              <div>
                                <Label>ملاحظات المستخدم</Label>
                                <p className="bg-muted p-2 rounded">{withdrawal.notes}</p>
                              </div>
                            )}
                            
                            {withdrawal.admin_notes && (
                              <div>
                                <Label>ملاحظات الإدارة</Label>
                                <p className="bg-muted p-2 rounded">{withdrawal.admin_notes}</p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredAndSortedWithdrawals.length === 0 && (
            <div className="text-center py-8">
              <ArrowUpFromLine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">لا توجد عمليات سحب</h3>
              <p className="text-muted-foreground">
                لم يتم العثور على طلبات سحب تطابق معايير البحث
              </p>
            </div>
          )}

          {/* Pagination Controls */}
          {!searchTerm.trim() && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                صفحة {page} من {totalPages} ({totalCount} طلب)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1 || loading}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1 || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </Button>
                
                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        disabled={loading}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages || loading}
                >
                  التالي
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages || loading}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}