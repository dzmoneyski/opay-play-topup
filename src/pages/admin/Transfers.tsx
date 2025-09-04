import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Send, 
  Search, 
  ArrowRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  User,
  Users
} from 'lucide-react';

export default function TransfersPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('all');

  // Mock data - في التطبيق الحقيقي، ستأتي من API
  const transfers = [
    {
      id: '1',
      sender_name: 'أحمد محمد علي',
      sender_email: 'ahmed@example.com',
      receiver_name: 'فاطمة الزهراء',
      receiver_email: 'fatima@example.com',
      receiver_phone: '0661234567',
      amount: 10000,
      reference: 'TR-2024-001',
      status: 'completed',
      created_at: '2024-03-01T10:30:00Z',
      completed_at: '2024-03-01T10:31:00Z',
      fee: 50
    },
    {
      id: '2',
      sender_name: 'يوسف بن صالح',
      sender_email: 'youssef@example.com',
      receiver_name: 'خديجة العلوي',
      receiver_email: 'khadija@example.com',
      receiver_phone: '0556789012',
      amount: 25000,
      reference: 'TR-2024-002',
      status: 'pending',
      created_at: '2024-03-01T14:20:00Z',
      completed_at: null,
      fee: 100
    },
    {
      id: '3',
      sender_name: 'محمد الأمين',
      sender_email: 'mohamed@example.com',
      receiver_name: 'رقم غير مسجل',
      receiver_phone: '0770000000',
      amount: 5000,
      reference: 'TR-2024-003',
      status: 'failed',
      created_at: '2024-03-01T16:45:00Z',
      completed_at: null,
      fee: 25,
      failure_reason: 'رقم المستقبل غير مسجل في النظام'
    }
  ];

  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = 
      transfer.sender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.receiver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transfer.receiver_phone && transfer.receiver_phone.includes(searchTerm));
    
    const matchesStatus = selectedStatus === 'all' || transfer.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const totalTransfers = transfers.reduce((sum, transfer) => 
    transfer.status === 'completed' ? sum + transfer.amount : sum, 0
  );
  const totalFees = transfers.reduce((sum, transfer) => 
    transfer.status === 'completed' ? sum + transfer.fee : sum, 0
  );
  const pendingTransfers = transfers.filter(t => t.status === 'pending').length;
  const completedTransfers = transfers.filter(t => t.status === 'completed').length;
  const failedTransfers = transfers.filter(t => t.status === 'failed').length;

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
        <h1 className="text-3xl font-bold text-foreground">إدارة التحويلات</h1>
        <p className="text-muted-foreground mt-2">
          مراقبة وإدارة جميع عمليات التحويل بين المستخدمين
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي التحويلات</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalTransfers)}
            </div>
            <p className="text-xs text-muted-foreground">هذا الشهر</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العمولات</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalFees)}
            </div>
            <p className="text-xs text-muted-foreground">إيرادات العمولات</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedTransfers}</div>
            <p className="text-xs text-muted-foreground">تم بنجاح</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">في انتظار</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingTransfers}</div>
            <p className="text-xs text-muted-foreground">تحتاج معالجة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">فاشلة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedTransfers}</div>
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
                placeholder="البحث بالاسم، رقم الهاتف، أو مرجع التحويل..."
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

      {/* Transfers Table */}
      <Card>
        <CardHeader>
          <CardTitle>سجل التحويلات ({filteredTransfers.length})</CardTitle>
          <CardDescription>
            عرض تفصيلي لجميع عمليات التحويل بين المستخدمين
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTransfers.map((transfer) => (
              <div key={transfer.id} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white">
                        <Send className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {formatCurrency(transfer.amount)}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {transfer.sender_name}
                          </span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {transfer.receiver_name}
                          </span>
                          <span>•</span>
                          <span>#{transfer.reference}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-4">
                        {transfer.receiver_phone && (
                          <div>
                            <span className="text-muted-foreground">رقم المستقبل: </span>
                            <span className="font-medium text-foreground">
                              {transfer.receiver_phone}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">العمولة: </span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(transfer.fee)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-muted-foreground">تاريخ الطلب: </span>
                          <span className="font-medium text-foreground">
                            {formatDate(transfer.created_at)}
                          </span>
                        </div>
                        {transfer.completed_at && (
                          <div>
                            <span className="text-muted-foreground">تاريخ الإكمال: </span>
                            <span className="font-medium text-foreground">
                              {formatDate(transfer.completed_at)}
                            </span>
                          </div>
                        )}
                      </div>

                      {transfer.status === 'failed' && transfer.failure_reason && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-800 text-xs">
                          <strong>سبب الفشل:</strong> {transfer.failure_reason}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(transfer.status)}
                    {transfer.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          تأكيد
                        </Button>
                        <Button size="sm" variant="destructive">
                          إلغاء
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

          {filteredTransfers.length === 0 && (
            <div className="text-center py-8">
              <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">لا توجد تحويلات</h3>
              <p className="text-muted-foreground">
                لم يتم العثور على تحويلات تطابق معايير البحث
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}