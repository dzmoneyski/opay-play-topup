import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAdminWithdrawals } from '@/hooks/useAdminWithdrawals';
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
  Eye
} from 'lucide-react';

export default function WithdrawalsPage() {
  const { withdrawals, loading, approveWithdrawal, rejectWithdrawal } = useAdminWithdrawals();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('all');
  const [selectedWithdrawal, setSelectedWithdrawal] = React.useState<any>(null);
  const [rejectReason, setRejectReason] = React.useState('');
  const [approveNotes, setApproveNotes] = React.useState('');
  const [actionLoading, setActionLoading] = React.useState(false);

  const filteredWithdrawals = withdrawals.filter(withdrawal => {
    const matchesSearch = 
      withdrawal.user_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.user_profile?.phone?.includes(searchTerm);
    
    const matchesStatus = selectedStatus === 'all' || withdrawal.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const totalWithdrawals = withdrawals.reduce((sum, withdrawal) => 
    withdrawal.status === 'completed' ? sum + withdrawal.amount : sum, 0
  );
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending').length;
  const approvedWithdrawals = withdrawals.filter(w => w.status === 'approved').length;
  const completedWithdrawals = withdrawals.filter(w => w.status === 'completed').length;
  const rejectedWithdrawals = withdrawals.filter(w => w.status === 'rejected').length;

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
    await approveWithdrawal(withdrawalId, approveNotes);
    setApproveNotes('');
    setActionLoading(false);
  };

  const handleReject = async (withdrawalId: string) => {
    if (!rejectReason.trim()) {
      return;
    }
    setActionLoading(true);
    await rejectWithdrawal(withdrawalId, rejectReason);
    setRejectReason('');
    setActionLoading(false);
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
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي السحوبات</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalWithdrawals)}
            </div>
            <p className="text-xs text-muted-foreground">المكتملة فقط</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد الانتظار</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingWithdrawals}</div>
            <p className="text-xs text-muted-foreground">تحتاج معالجة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معتمدة</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{approvedWithdrawals}</div>
            <p className="text-xs text-muted-foreground">في المعالجة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedWithdrawals}</div>
            <p className="text-xs text-muted-foreground">تم بنجاح</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مرفوضة</CardTitle>
            <X className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedWithdrawals}</div>
            <p className="text-xs text-muted-foreground">تم رفضها</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="البحث بالاسم، معرف الطلب، أو رقم الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">قيد الانتظار</option>
              <option value="approved">معتمد</option>
              <option value="completed">مكتمل</option>
              <option value="rejected">مرفوض</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawals Table */}
      <Card>
        <CardHeader>
          <CardTitle>سجل عمليات السحب ({filteredWithdrawals.length})</CardTitle>
          <CardDescription>
            عرض تفصيلي لجميع طلبات السحب وحالتها
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
              {filteredWithdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 bg-gradient-secondary rounded-full flex items-center justify-center text-white">
                          <ArrowUpFromLine className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {formatCurrency(withdrawal.amount)}
                          </h3>
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
                        ) : (
                          <div>
                            <span className="text-muted-foreground">الحساب: </span>
                            <span className="font-medium text-foreground">
                              {withdrawal.account_holder_name} - {withdrawal.account_number}
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
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                موافقة
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>موافقة على طلب السحب</DialogTitle>
                                <DialogDescription>
                                  هل أنت متأكد من موافقتك على هذا الطلب؟ سيتم خصم المبلغ من رصيد المستخدم.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
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
                                    onClick={() => handleApprove(withdrawal.id)}
                                    disabled={actionLoading}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    {actionLoading ? "جاري المعالجة..." : "تأكيد الموافقة"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                رفض
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>رفض طلب السحب</DialogTitle>
                                <DialogDescription>
                                  يرجى إدخال سبب رفض هذا الطلب
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="reject-reason">سبب الرفض *</Label>
                                  <Textarea
                                    id="reject-reason"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="اذكر سبب رفض الطلب..."
                                    required
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    onClick={() => handleReject(withdrawal.id)}
                                    disabled={actionLoading || !rejectReason.trim()}
                                    variant="destructive"
                                  >
                                    {actionLoading ? "جاري المعالجة..." : "تأكيد الرفض"}
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

          {!loading && filteredWithdrawals.length === 0 && (
            <div className="text-center py-8">
              <ArrowUpFromLine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">لا توجد عمليات سحب</h3>
              <p className="text-muted-foreground">
                لم يتم العثور على طلبات سحب تطابق معايير البحث
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}