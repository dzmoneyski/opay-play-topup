import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowUpFromLine, 
  Search, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  User,
  CreditCard
} from 'lucide-react';

export default function WithdrawalsPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('all');

  // Mock data - في التطبيق الحقيقي، ستأتي من API
  const withdrawals = [
    {
      id: '1',
      user_name: 'أحمد محمد علي',
      user_email: 'ahmed@example.com',
      amount: 30000,
      method: 'تحويل بنكي',
      bank_details: 'بنك الجزائر الخارجي - ***1234',
      reference: 'WD-2024-001',
      status: 'completed',
      created_at: '2024-03-01T09:15:00Z',
      completed_at: '2024-03-01T11:20:00Z'
    },
    {
      id: '2',
      user_name: 'فاطمة الزهراء',
      user_email: 'fatima@example.com',
      amount: 15000,
      method: 'تحويل بنكي',
      bank_details: 'البنك الوطني الجزائري - ***5678',
      reference: 'WD-2024-002',
      status: 'pending',
      created_at: '2024-03-01T13:30:00Z',
      completed_at: null
    },
    {
      id: '3',
      user_name: 'يوسف بن صالح',
      user_email: 'youssef@example.com',
      amount: 50000,
      method: 'تحويل بنكي',
      bank_details: 'بنك السلام - ***9012',
      reference: 'WD-2024-003',
      status: 'under_review',
      created_at: '2024-03-01T15:45:00Z',
      completed_at: null
    },
    {
      id: '4',
      user_name: 'خديجة العلوي',
      user_email: 'khadija@example.com',
      amount: 80000,
      method: 'تحويل بنكي',
      bank_details: 'بنك التنمية المحلية - ***3456',
      reference: 'WD-2024-004',
      status: 'rejected',
      rejection_reason: 'مبلغ يتجاوز الحد اليومي المسموح',
      created_at: '2024-03-01T17:00:00Z',
      completed_at: null
    }
  ];

  const filteredWithdrawals = withdrawals.filter(withdrawal => {
    const matchesSearch = 
      withdrawal.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || withdrawal.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const totalWithdrawals = withdrawals.reduce((sum, withdrawal) => 
    withdrawal.status === 'completed' ? sum + withdrawal.amount : sum, 0
  );
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending').length;
  const underReviewWithdrawals = withdrawals.filter(w => w.status === 'under_review').length;
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
            في انتظار
          </Badge>
        );
      case 'under_review':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            قيد المراجعة
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
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
      minimumFractionDigits: 0
    }).format(amount);
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
            <p className="text-xs text-muted-foreground">هذا الشهر</p>
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
            <CardTitle className="text-sm font-medium">في انتظار</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingWithdrawals}</div>
            <p className="text-xs text-muted-foreground">تحتاج معالجة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد المراجعة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{underReviewWithdrawals}</div>
            <p className="text-xs text-muted-foreground">تحتاج تدقيق</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مرفوضة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
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
                placeholder="البحث بالاسم، المرجع، أو البريد الإلكتروني..."
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
              <option value="pending">في انتظار</option>
              <option value="under_review">قيد المراجعة</option>
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
                            {withdrawal.user_name}
                          </span>
                          <span>•</span>
                          <span>#{withdrawal.reference}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">البنك: </span>
                        <span className="font-medium text-foreground">
                          {withdrawal.bank_details}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-muted-foreground">تاريخ الطلب: </span>
                          <span className="font-medium text-foreground">
                            {formatDate(withdrawal.created_at)}
                          </span>
                        </div>
                        {withdrawal.completed_at && (
                          <div>
                            <span className="text-muted-foreground">تاريخ الإكمال: </span>
                            <span className="font-medium text-foreground">
                              {formatDate(withdrawal.completed_at)}
                            </span>
                          </div>
                        )}
                      </div>

                      {withdrawal.status === 'rejected' && withdrawal.rejection_reason && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-800 text-xs">
                          <strong>سبب الرفض:</strong> {withdrawal.rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(withdrawal.status)}
                    {withdrawal.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          موافقة
                        </Button>
                        <Button size="sm" variant="destructive">
                          رفض
                        </Button>
                      </div>
                    )}
                    {withdrawal.status === 'under_review' && (
                      <div className="flex gap-1">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          مراجعة
                        </Button>
                      </div>
                    )}
                    <Button variant="outline" size="sm">
                      عرض التفاصيل
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredWithdrawals.length === 0 && (
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