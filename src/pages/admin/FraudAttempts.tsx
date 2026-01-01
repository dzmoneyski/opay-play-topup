import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  AlertTriangle, 
  Search, 
  RefreshCw,
  User,
  Globe,
  Clock,
  FileWarning
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface FraudAttempt {
  id: string;
  user_id: string | null;
  attempt_type: string;
  ip_address: string | null;
  details: unknown;
  created_at: string;
  user_name?: string;
  user_phone?: string;
}

const FraudAttempts = () => {
  const [attempts, setAttempts] = useState<FraudAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fraud_attempts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user details for each attempt
      const attemptsWithUsers = await Promise.all(
        (data || []).map(async (attempt) => {
          if (attempt.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, phone')
              .eq('user_id', attempt.user_id)
              .maybeSingle();
            
            return {
              ...attempt,
              user_name: profile?.full_name || 'غير معروف',
              user_phone: profile?.phone || 'غير متاح'
            };
          }
          return {
            ...attempt,
            user_name: 'غير معروف',
            user_phone: 'غير متاح'
          };
        })
      );

      setAttempts(attemptsWithUsers);
    } catch (error) {
      console.error('Error fetching fraud attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
  }, []);

  const getAttemptTypeBadge = (type: string) => {
    const types: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
      'duplicate_account': { label: 'حساب مكرر', variant: 'destructive' },
      'fake_referral': { label: 'إحالة وهمية', variant: 'destructive' },
      'suspicious_transfer': { label: 'تحويل مشبوه', variant: 'secondary' },
      'multiple_devices': { label: 'أجهزة متعددة', variant: 'outline' },
      'rate_limit_exceeded': { label: 'تجاوز الحد', variant: 'secondary' },
      'invalid_gift_card': { label: 'بطاقة غير صالحة', variant: 'outline' }
    };

    const config = types[type] || { label: type, variant: 'default' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredAttempts = attempts.filter(attempt => 
    attempt.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attempt.user_phone?.includes(searchTerm) ||
    attempt.attempt_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attempt.ip_address?.includes(searchTerm)
  );

  const stats = {
    total: attempts.length,
    today: attempts.filter(a => 
      new Date(a.created_at).toDateString() === new Date().toDateString()
    ).length,
    duplicateAccounts: attempts.filter(a => a.attempt_type === 'duplicate_account').length,
    fakeReferrals: attempts.filter(a => a.attempt_type === 'fake_referral').length
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            محاولات الاحتيال
          </h1>
          <p className="text-muted-foreground mt-1">
            مراقبة ومتابعة محاولات الاحتيال والنشاط المشبوه
          </p>
        </div>
        <Button onClick={fetchAttempts} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <FileWarning className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">إجمالي المحاولات</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.today}</p>
                <p className="text-xs text-muted-foreground">اليوم</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <User className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.duplicateAccounts}</p>
                <p className="text-xs text-muted-foreground">حسابات مكررة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <AlertTriangle className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.fakeReferrals}</p>
                <p className="text-xs text-muted-foreground">إحالات وهمية</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث بالاسم، الهاتف، نوع المحاولة، أو IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            سجل المحاولات ({filteredAttempts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد محاولات احتيال مسجلة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">IP</TableHead>
                    <TableHead className="text-right">التفاصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(attempt.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        {getAttemptTypeBadge(attempt.attempt_type)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{attempt.user_name}</span>
                        </div>
                      </TableCell>
                      <TableCell dir="ltr" className="text-right">
                        {attempt.user_phone}
                      </TableCell>
                      <TableCell dir="ltr" className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{attempt.ip_address || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {attempt.details ? (
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-20">
                            {JSON.stringify(attempt.details, null, 2)}
                          </pre>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FraudAttempts;
