import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Gift, 
  Search, 
  ShoppingBag,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  User,
  CreditCard,
  Plus
} from 'lucide-react';

export default function CardsPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [selectedStatus, setSelectedStatus] = React.useState('all');

  // Mock data - في التطبيق الحقيقي، ستأتي من API
  const cardSales = [
    {
      id: '1',
      buyer_name: 'أحمد محمد علي',
      buyer_email: 'ahmed@example.com',
      card_type: 'Google Play',
      card_value: 25,
      price_dzd: 5000,
      reference: 'CD-2024-001',
      status: 'delivered',
      created_at: '2024-03-01T10:30:00Z',
      delivered_at: '2024-03-01T10:32:00Z'
    },
    {
      id: '2',
      buyer_name: 'فاطمة الزهراء',
      buyer_email: 'fatima@example.com',
      card_type: 'Steam Wallet',
      card_value: 50,
      price_dzd: 12000,
      reference: 'CD-2024-002',
      status: 'pending',
      created_at: '2024-03-01T14:20:00Z',
      delivered_at: null
    },
    {
      id: '3',
      buyer_name: 'يوسف بن صالح',
      buyer_email: 'youssef@example.com',
      card_type: 'Netflix',
      card_value: 15,
      price_dzd: 4500,
      reference: 'CD-2024-003',
      status: 'failed',
      created_at: '2024-03-01T16:45:00Z',
      delivered_at: null,
      failure_reason: 'نفاد المخزون'
    }
  ];

  const cardInventory = [
    { type: 'Google Play', values: [10, 25, 50, 100], stock: { 10: 45, 25: 32, 50: 18, 100: 8 } },
    { type: 'Steam Wallet', values: [20, 50, 100], stock: { 20: 28, 50: 15, 100: 5 } },
    { type: 'Netflix', values: [15, 30], stock: { 15: 20, 30: 12 } },
    { type: 'PlayStation', values: [25, 50, 100], stock: { 25: 0, 50: 8, 100: 3 } }
  ];

  const filteredSales = cardSales.filter(sale => {
    const matchesSearch = 
      sale.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.card_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || sale.card_type === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || sale.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalRevenue = cardSales.reduce((sum, sale) => 
    sale.status === 'delivered' ? sum + sale.price_dzd : sum, 0
  );
  const pendingSales = cardSales.filter(s => s.status === 'pending').length;
  const deliveredSales = cardSales.filter(s => s.status === 'delivered').length;
  const failedSales = cardSales.filter(s => s.status === 'failed').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            تم التسليم
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

  const getStockStatus = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">نفد المخزون</Badge>;
    } else if (stock <= 5) {
      return <Badge className="bg-yellow-100 text-yellow-800">مخزون منخفض</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800">متوفر</Badge>;
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
        <h1 className="text-3xl font-bold text-foreground">إدارة البطاقات الرقمية</h1>
        <p className="text-muted-foreground mt-2">
          إدارة المخزون ومبيعات البطاقات الرقمية
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">هذا الشهر</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تم التسليم</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{deliveredSales}</div>
            <p className="text-xs text-muted-foreground">بطاقة مُسلمة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">في انتظار</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingSales}</div>
            <p className="text-xs text-muted-foreground">طلبات معلقة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">طلبات فاشلة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedSales}</div>
            <p className="text-xs text-muted-foreground">تحتاج انتباه</p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>إدارة المخزون</CardTitle>
              <CardDescription>
                عرض وإدارة مخزون البطاقات الرقمية المتوفرة
              </CardDescription>
            </div>
            <Button className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              إضافة مخزون
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cardInventory.map((card) => (
              <div key={card.type} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{card.type}</h3>
                </div>
                <div className="space-y-2">
                  {card.values.map((value) => (
                    <div key={value} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">${value}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{card.stock[value]} قطعة</span>
                        {getStockStatus(card.stock[value])}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
                placeholder="البحث بالاسم، المرجع، أو نوع البطاقة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="all">جميع الأنواع</option>
              <option value="Google Play">Google Play</option>
              <option value="Steam Wallet">Steam Wallet</option>
              <option value="Netflix">Netflix</option>
              <option value="PlayStation">PlayStation</option>
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="all">جميع الحالات</option>
              <option value="delivered">تم التسليم</option>
              <option value="pending">في انتظار</option>
              <option value="failed">فاشل</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>سجل مبيعات البطاقات ({filteredSales.length})</CardTitle>
          <CardDescription>
            عرض تفصيلي لجميع مبيعات البطاقات الرقمية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSales.map((sale) => (
              <div key={sale.id} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-10 h-10 bg-gradient-gold rounded-full flex items-center justify-center text-white">
                        <Gift className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {sale.card_type} - ${sale.card_value}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {sale.buyer_name}
                          </span>
                          <span>•</span>
                          <span>#{sale.reference}</span>
                          <span>•</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(sale.price_dzd)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">تاريخ الطلب: </span>
                        <span className="font-medium text-foreground">
                          {formatDate(sale.created_at)}
                        </span>
                      </div>
                      {sale.delivered_at && (
                        <div>
                          <span className="text-muted-foreground">تاريخ التسليم: </span>
                          <span className="font-medium text-foreground">
                            {formatDate(sale.delivered_at)}
                          </span>
                        </div>
                      )}
                    </div>

                    {sale.status === 'failed' && sale.failure_reason && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-xs">
                        <strong>سبب الفشل:</strong> {sale.failure_reason}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(sale.status)}
                    {sale.status === 'pending' && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        تسليم البطاقة
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

          {filteredSales.length === 0 && (
            <div className="text-center py-8">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">لا توجد مبيعات</h3>
              <p className="text-muted-foreground">
                لم يتم العثور على مبيعات بطاقات تطابق معايير البحث
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}