import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminDeposits } from '@/hooks/useAdminDeposits';
import { useFlexyDeposit } from '@/hooks/useFlexyDeposit';
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
  Search,
  Filter,
  X,
  Smartphone
} from 'lucide-react';

const getPaymentMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    baridimob: 'بريدي موب',
    ccp: 'CCP',
    edahabiya: 'الذهبية',
    albaraka: 'بنك البركة',
    badr: 'بنك البدر',
    atm: 'صراف آلي',
    cash: 'دفع نقدي',
    flexy_mobilis: 'فليكسي موبيليس',
  };
  return labels[method] || method;
};

export default function DepositsPage() {
  const { deposits, loading, approveDeposit, rejectDeposit, fetchDeposits } = useAdminDeposits();
  const { settings: flexySettings } = useFlexyDeposit();
  const [selectedDeposit, setSelectedDeposit] = React.useState<any>(null);
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [approvalNotes, setApprovalNotes] = React.useState('');
  const [adjustedAmount, setAdjustedAmount] = React.useState('');
  const [processing, setProcessing] = React.useState(false);
  
  // Search & Filter states
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [amountMin, setAmountMin] = React.useState('');
  const [amountMax, setAmountMax] = React.useState('');
  const [timeFrom, setTimeFrom] = React.useState('');
  const [timeTo, setTimeTo] = React.useState('');

  // جلب جميع البيانات عند البحث أو الفلترة
  const hasActiveFilters = searchQuery.trim() || statusFilter !== 'all' || dateFrom || dateTo || amountMin || amountMax || timeFrom || timeTo;
  
  React.useEffect(() => {
    if (hasActiveFilters) {
      fetchDeposits(true); // جلب الكل
    } else {
      fetchDeposits(false); // جلب مع التصفح
    }
  }, [searchQuery, statusFilter, dateFrom, dateTo, amountMin, amountMax, timeFrom, timeTo]);

  // حساب المبلغ المعدّل لإيداعات الفليكسي (خصم رسوم الفليكسي)
  const calculateFlexyAdjustedAmount = (originalAmount: number) => {
    const flexyFee = Math.round((originalAmount * flexySettings.fee_percentage) / 100);
    return originalAmount - flexyFee;
  };

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    const { data } = supabase.storage.from('deposit-receipts').getPublicUrl(imagePath);
    return data.publicUrl;
  };

  const handleApprove = async (depositId: string, notes?: string, amount?: number) => {
    setProcessing(true);
    const result = await approveDeposit(depositId, notes, amount);
    if (result.success) {
      setApprovalNotes('');
      setAdjustedAmount('');
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

  // Filter deposits based on search and filters
  const filteredDeposits = React.useMemo(() => {
    return deposits.filter(deposit => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = deposit.profiles?.full_name?.toLowerCase().includes(query);
        const matchesPhone = deposit.profiles?.phone?.includes(query);
        const matchesTransactionId = deposit.transaction_id?.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesTransactionId) {
          return false;
        }
      }
      
      // Status filter
      if (statusFilter !== 'all' && deposit.status !== statusFilter) {
        return false;
      }
      
      // Date from filter
      if (dateFrom) {
        const depositDate = new Date(deposit.created_at);
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (depositDate < fromDate) return false;
      }
      
      // Date to filter
      if (dateTo) {
        const depositDate = new Date(deposit.created_at);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (depositDate > toDate) return false;
      }
      
      // Amount min filter
      if (amountMin && deposit.amount < Number(amountMin)) {
        return false;
      }
      
      // Amount max filter
      if (amountMax && deposit.amount > Number(amountMax)) {
        return false;
      }
      
      // Time from filter
      if (timeFrom) {
        const depositDate = new Date(deposit.created_at);
        const [hours, minutes] = timeFrom.split(':').map(Number);
        const depositMinutes = depositDate.getHours() * 60 + depositDate.getMinutes();
        const filterMinutes = hours * 60 + minutes;
        if (depositMinutes < filterMinutes) return false;
      }
      
      // Time to filter
      if (timeTo) {
        const depositDate = new Date(deposit.created_at);
        const [hours, minutes] = timeTo.split(':').map(Number);
        const depositMinutes = depositDate.getHours() * 60 + depositDate.getMinutes();
        const filterMinutes = hours * 60 + minutes;
        if (depositMinutes > filterMinutes) return false;
      }
      
      return true;
    });
  }, [deposits, searchQuery, statusFilter, dateFrom, dateTo, amountMin, amountMax, timeFrom, timeTo]);

  const pendingDeposits = filteredDeposits.filter(d => d.status === 'pending');
  const approvedDeposits = deposits.filter(d => d.status === 'approved').length;
  const rejectedDeposits = deposits.filter(d => d.status === 'rejected').length;
  
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setTimeFrom('');
    setTimeTo('');
  };
  
  // تم نقل hasActiveFilters لأعلى للاستخدام في useEffect

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
            <div className="text-2xl font-bold text-yellow-600">{deposits.filter(d => d.status === 'pending').length}</div>
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

      {/* Search & Filter Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            البحث والفلترة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم، الهاتف، أو معرف المعاملة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">قيد المراجعة</SelectItem>
                <SelectItem value="approved">مقبولة</SelectItem>
                <SelectItem value="rejected">مرفوضة</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Date From */}
            <div>
              <Input
                type="date"
                placeholder="من تاريخ"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            
            {/* Date To */}
            <div>
              <Input
                type="date"
                placeholder="إلى تاريخ"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          
          {/* Second Row: Amount & Time Filters */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
            {/* Amount Min */}
            <div>
              <Input
                type="number"
                placeholder="الحد الأدنى للمبلغ"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                min={0}
              />
            </div>
            
            {/* Amount Max */}
            <div>
              <Input
                type="number"
                placeholder="الحد الأقصى للمبلغ"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                min={0}
              />
            </div>
            
            {/* Time From */}
            <div>
              <Input
                type="time"
                placeholder="من ساعة"
                value={timeFrom}
                onChange={(e) => setTimeFrom(e.target.value)}
              />
            </div>
            
            {/* Time To */}
            <div>
              <Input
                type="time"
                placeholder="إلى ساعة"
                value={timeTo}
                onChange={(e) => setTimeTo(e.target.value)}
              />
            </div>
          </div>
          
          {/* Active Filters & Clear */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                عرض {filteredDeposits.length} من أصل {deposits.length} طلب
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 ml-1" />
                مسح الفلاتر
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
                          <span>{getPaymentMethodLabel(deposit.payment_method)}</span>
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
                    {deposit.payment_method === 'flexy_mobilis' ? (
                      (() => {
                        // Parse transaction_id format: "phone|HH:MM:SS" or legacy "phone"
                        const parts = (deposit.transaction_id || '').split('|');
                        const senderPhone = parts[0] || 'غير محدد';
                        const sendTime = parts[1] || null;
                        return (
                          <>
                            <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                              <span className="text-green-700 dark:text-green-400 font-semibold flex items-center gap-1">
                                <Smartphone className="h-3.5 w-3.5" />
                                رقم المرسل:
                              </span>
                              <span className="font-bold text-green-800 dark:text-green-300 font-mono text-base" dir="ltr">
                                {senderPhone}
                              </span>
                            </div>
                            {sendTime && (
                              <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                <span className="text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  وقت الإرسال (من المستخدم):
                                </span>
                                <span className="font-bold text-blue-800 dark:text-blue-300 font-mono text-lg" dir="ltr">
                                  {sendTime}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">وقت تقديم الطلب:</span>
                              <span className="font-medium font-mono" dir="ltr">
                                {new Date(deposit.created_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">معرف المعاملة:</span>
                        <span className="font-medium">{deposit.transaction_id || 'غير محدد'}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">رقم هاتف المستخدم:</span>
                      <span className="font-medium">{deposit.profiles?.phone || 'غير محدد'}</span>
                    </div>
                  </div>

                  {/* Receipt Image */}
                  {deposit.receipt_image && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        {deposit.payment_method === 'flexy_mobilis' ? '📱 صورة رسالة تأكيد الإرسال' : 'صورة الوصل'}
                      </h4>
                      <img
                        src={getImageUrl(deposit.receipt_image) || ''}
                        alt={deposit.payment_method === 'flexy_mobilis' ? 'تأكيد إرسال الفليكسي' : 'وصل الإيداع'}
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
                          onClick={() => { 
                            setSelectedDeposit(deposit);
                            setApprovalNotes('');
                            // للفليكسي: خصم رسوم الفليكسي تلقائياً
                            if (deposit.payment_method === 'flexy_mobilis') {
                              setAdjustedAmount(String(calculateFlexyAdjustedAmount(deposit.amount)));
                            } else {
                              setAdjustedAmount(String(deposit.amount));
                            }
                          }}
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
                          {/* عرض تفاصيل رسوم الفليكسي */}
                          {deposit.payment_method === 'flexy_mobilis' && (
                            <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800 space-y-2">
                              <h4 className="font-semibold text-orange-800 dark:text-orange-300 text-sm">📊 تفاصيل رسوم الفليكسي</h4>
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">المبلغ الأصلي:</span>
                                  <span className="font-medium">{formatAmount(deposit.amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-orange-600 dark:text-orange-400">رسوم الفليكسي ({flexySettings.fee_percentage}%):</span>
                                  <span className="font-medium text-orange-600 dark:text-orange-400">
                                    -{formatAmount(Math.round((deposit.amount * flexySettings.fee_percentage) / 100))}
                                  </span>
                                </div>
                                <div className="border-t border-orange-200 dark:border-orange-700 pt-1">
                                  <div className="flex justify-between font-bold">
                                    <span>بعد خصم الفليكسي:</span>
                                    <span className="text-green-600">{formatAmount(calculateFlexyAdjustedAmount(deposit.amount))}</span>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                  + سيتم تطبيق رسوم الإيداع العامة (0.5%) تلقائياً عند القبول
                                </p>
                              </div>
                            </div>
                          )}
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
                          <div>
                            <Label htmlFor="approval-amount">المبلغ النهائي (د.ج)</Label>
                            <Input
                              id="approval-amount"
                              type="number"
                              min={0}
                              step={0.01}
                              value={adjustedAmount}
                              onChange={(e) => setAdjustedAmount(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {deposit.payment_method === 'flexy_mobilis' 
                                ? 'المبلغ بعد خصم رسوم الفليكسي (يمكنك تعديله يدوياً)' 
                                : 'المبلغ الذي سيتم اعتماده عند قبول الطلب'}
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => {
                              if (!selectedDeposit) return;
                              const amountNum = adjustedAmount.trim() === '' ? undefined : Number(adjustedAmount);
                              handleApprove(selectedDeposit.id, approvalNotes, amountNum);
                            }}
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
            {hasActiveFilters && (
              <Badge variant="secondary" className="mr-2">
                {filteredDeposits.length} نتيجة
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            جميع طلبات الإيداع في النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDeposits.length === 0 ? (
            <div className="text-center py-8">
              <ArrowDownToLine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد طلبات إيداع</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDeposits.map((deposit) => (
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
                    <p>طريقة الدفع: {getPaymentMethodLabel(deposit.payment_method)}</p>
                    {deposit.payment_method === 'flexy_mobilis' ? (
                      <>
                        <p>رقم المرسل: {(deposit.transaction_id || '').split('|')[0]}</p>
                        {(deposit.transaction_id || '').includes('|') && (
                          <p className="font-semibold text-blue-600">وقت الإرسال: <span className="font-mono">{(deposit.transaction_id || '').split('|')[1]}</span></p>
                        )}
                      </>
                    ) : (
                      <p>معرف المعاملة: {deposit.transaction_id}</p>
                    )}
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