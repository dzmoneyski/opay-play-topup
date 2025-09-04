import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Search, 
  UserCheck, 
  UserX, 
  Phone, 
  Mail, 
  Calendar,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = React.useState('');

  // Mock data - في التطبيق الحقيقي، ستأتي من API
  const users = [
    {
      id: '1',
      full_name: 'أحمد محمد علي',
      email: 'ahmed@example.com',
      phone: '0556123456',
      is_phone_verified: true,
      is_identity_verified: true,
      is_account_activated: true,
      created_at: '2024-01-15T10:30:00Z',
      last_login: '2024-03-01T14:20:00Z',
      balance: 25000,
      total_transactions: 45
    },
    {
      id: '2',
      full_name: 'فاطمة الزهراء',
      email: 'fatima@example.com',
      phone: '0661234567',
      is_phone_verified: true,
      is_identity_verified: false,
      is_account_activated: false,
      created_at: '2024-02-20T16:45:00Z',
      last_login: '2024-02-28T09:15:00Z',
      balance: 5000,
      total_transactions: 8
    },
    {
      id: '3',
      full_name: 'محمد الأمين بن عيسى',
      email: 'mohamed@example.com',
      phone: '0770123456',
      is_phone_verified: false,
      is_identity_verified: false,
      is_account_activated: false,
      created_at: '2024-03-01T08:00:00Z',
      last_login: '2024-03-01T08:00:00Z',
      balance: 0,
      total_transactions: 0
    }
  ];

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone.includes(searchTerm)
  );

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_account_activated).length;
  const pendingUsers = users.filter(u => !u.is_account_activated).length;
  const verifiedUsers = users.filter(u => u.is_identity_verified).length;

  const getStatusBadge = (user: any) => {
    if (user.is_account_activated) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          مفعل
        </Badge>
      );
    } else if (user.is_phone_verified && !user.is_identity_verified) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          في انتظار التحقق
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-gray-600">
          <AlertCircle className="w-3 h-3 mr-1" />
          غير مكتمل
        </Badge>
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
        <h1 className="text-3xl font-bold text-foreground">إدارة المستخدمين</h1>
        <p className="text-muted-foreground mt-2">
          عرض وإدارة جميع المستخدمين المسجلين في المنصة
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">مستخدمين مسجلين</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الحسابات المفعلة</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">حسابات نشطة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">في انتظار التفعيل</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingUsers}</div>
            <p className="text-xs text-muted-foreground">حسابات معلقة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">موثقين الهوية</CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{verifiedUsers}</div>
            <p className="text-xs text-muted-foreground">تم التحقق منهم</p>
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
                placeholder="البحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Button variant="outline">
              تصفية متقدمة
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المستخدمين ({filteredUsers.length})</CardTitle>
          <CardDescription>
            عرض تفصيلي لجميع المستخدمين وحالة حساباتهم
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold">
                        {user.full_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{user.full_name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            انضم في {formatDate(user.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="text-muted-foreground">الرصيد: </span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(user.balance)}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">العمليات: </span>
                        <span className="font-semibold text-foreground">
                          {user.total_transactions}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">آخر دخول: </span>
                        <span className="font-semibold text-foreground">
                          {formatDate(user.last_login)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(user)}
                    <Button variant="outline" size="sm">
                      عرض التفاصيل
                    </Button>
                  </div>
                </div>

                {/* Verification Status */}
                <div className="mt-3 flex gap-2 text-xs">
                  <Badge variant={user.is_phone_verified ? "default" : "secondary"}>
                    <Phone className="w-3 h-3 mr-1" />
                    {user.is_phone_verified ? "هاتف موثق" : "هاتف غير موثق"}
                  </Badge>
                  <Badge variant={user.is_identity_verified ? "default" : "secondary"}>
                    <Shield className="w-3 h-3 mr-1" />
                    {user.is_identity_verified ? "هوية موثقة" : "هوية غير موثقة"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">لا توجد نتائج</h3>
              <p className="text-muted-foreground">
                لم يتم العثور على مستخدمين يطابقون معايير البحث
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}