import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowDownToLine, 
  Search, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  User
} from 'lucide-react';

export default function DepositsPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('all');

  // Mock data - في التطبيق الحقيقي، ستأتي من API
  const deposits = [
    {
      id: '1',
      user_name: 'أحمد محمد علي',
      user_email: 'ahmed@example.com',
      amount: 50000,
      method: 'بطاقة OpaY',
      reference: 'DP-2024-001',
      status: 'completed',
      created_at: '2024-03-01T10:30:00Z',
      completed_at: '2024-03-01T10:35:00Z'
    },
    {
      id: '2',
      user_name: 'فاطمة الزهراء',
      user_email: 'fatima@example.com',
      amount: 25000,
      method: 'تحويل بنكي',
      reference: 'DP-2024-002',
      status: 'pending',
      created_at: '2024-03-01T14:20:00Z',
      completed_at: null
    },
    {
      id: '3',
      user_name: 'محمد الأمين',
      user_email: 'mohamed@example.com',
      amount: 75000,
      method: 'بطاقة OpaY',
      reference: 'DP-2024-003',
      status: 'failed',
      created_at: '2024-03-01T16:45:00Z',
      completed_at: null
    }
  ];

  const filteredDeposits = deposits.filter(deposit => {
    const matchesSearch = 
      deposit.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deposit.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deposit.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || deposit.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const totalDeposits = deposits.reduce((sum, deposit) => 
    deposit.status === 'completed' ? sum + deposit.amount : sum, 0
  );
  const pendingDeposits = deposits.filter(d => d.status === 'pending').length;
  const completedDeposits = deposits.filter(d => d.status === 'completed').length;
  const failedDeposits = deposits.filter(d => d.status === 'failed').length;

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
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            فاشل
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
        <h1 className="text-3xl font-bold text-foreground">إدارة عمليات الإيداع</h1>
        <p className="text-muted-foreground mt-2">
          مراقبة وإدارة جميع عمليات إيداع الأموال في المنصة
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيداعات</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalDeposits)}
            </div>
            <p className="text-xs text-muted-foreground">هذا الشهر</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عمليات مكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedDeposits}</div>
            <p className="text-xs text-muted-foreground">تم بنجاح</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">في انتظار</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingDeposits}</div>
            <p className="text-xs text-muted-foreground">تحتاج مراجعة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عمليات فاشلة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedDeposits}</div>
            <p className="text-xs text-muted-foreground">تحتاج انتباه</p>
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
              <option value="completed">مكتمل</option>
              <option value="pending">في انتظار</option>
              <option value="failed">فاشل</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Deposits Table */}
      <Card>
        <CardHeader>
          <CardTitle>سجل عمليات الإيداع ({filteredDeposits.length})</CardTitle>
          <CardDescription>
            عرض تفصيلي لجميع عمليات الإيداع وحالتها
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDeposits.map((deposit) => (
              <div key={deposit.id} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white">
                        <ArrowDownToLine className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {formatCurrency(deposit.amount)}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {deposit.user_name}
                          </span>
                          <span>•</span>
                          <span>{deposit.method}</span>
                          <span>•</span>
                          <span>#{deposit.reference}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">تاريخ الطلب: </span>
                        <span className="font-medium text-foreground">
                          {formatDate(deposit.created_at)}
                        </span>
                      </div>
                      {deposit.completed_at && (
                        <div>
                          <span className="text-muted-foreground">تاريخ الإكمال: </span>
                          <span className="font-medium text-foreground">
                            {formatDate(deposit.completed_at)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(deposit.status)}
                    {deposit.status === 'pending' && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        تأكيد
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      عرض التفاصيل
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredDeposits.length === 0 && (
            <div className="text-center py-8">
              <ArrowDownToLine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">لا توجد عمليات إيداع</h3>
              <p className="text-muted-foreground">
                لم يتم العثور على عمليات إيداع تطابق معايير البحث
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}