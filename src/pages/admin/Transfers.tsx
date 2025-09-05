import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
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
  const [transfers, setTransfers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Fetch real transfer data
  React.useEffect(() => {
    const fetchTransfers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('transfers')
          .select(`
            *
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Get profile data for each transfer
        const transfersWithProfiles = await Promise.all(
          (data || []).map(async (transfer) => {
            const [senderRes, recipientRes] = await Promise.all([
              supabase.from('profiles').select('full_name, phone').eq('user_id', transfer.sender_id).single(),
              supabase.from('profiles').select('full_name, phone').eq('user_id', transfer.recipient_id).single()
            ]);

            return {
              ...transfer,
              sender: senderRes.data,
              recipient: recipientRes.data
            };
          })
        );

        const formattedTransfers = transfersWithProfiles.map(transfer => ({
          id: transfer.id,
          sender_name: transfer.sender?.full_name || 'مستخدم غير محدد',
          sender_phone: transfer.sender_phone,
          receiver_name: transfer.recipient?.full_name || 'مستخدم غير محدد',
          receiver_phone: transfer.recipient_phone,
          amount: Number(transfer.amount),
          reference: `TR-${transfer.id.slice(0, 8)}`,
          status: transfer.status,
          created_at: transfer.created_at,
          completed_at: transfer.updated_at,
          note: transfer.note,
          fee: Math.round(Number(transfer.amount) * 0.005) // 0.5% fee calculation
        }));

        setTransfers(formattedTransfers);
      } catch (error) {
        console.error('Error fetching transfers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransfers();
  }, []);

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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid gap-4 md:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded" />
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

                          {transfer.note && (
                          <div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs">
                            <strong>ملاحظة:</strong> {transfer.note}
                          </div>
                        )}
                    </div>
                  </div>
                  
                    <div className="flex items-center gap-2">
                      {getStatusBadge(transfer.status)}
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