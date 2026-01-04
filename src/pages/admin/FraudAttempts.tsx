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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  Search, 
  RefreshCw,
  User,
  Globe,
  Clock,
  FileWarning,
  Ban,
  Shield,
  Eye,
  ShieldAlert,
  ShieldX,
  ShieldCheck,
  Repeat,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface FraudAttempt {
  id: string;
  user_id: string | null;
  attempt_type: string;
  ip_address: string | null;
  details: unknown;
  created_at: string;
  user_name?: string;
  user_phone?: string;
  user_email?: string;
  attempt_count?: number;
  is_blocked?: boolean;
}

interface UserDetails {
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  created_at: string;
  is_account_activated: boolean;
  attempts: FraudAttempt[];
  total_attempts: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

const FraudAttempts = () => {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<FraudAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [selectedUser, setSelectedUser] = useState<FraudAttempt | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);

  const fetchBlockedUsers = async () => {
    const { data } = await supabase
      .from('blocked_users')
      .select('user_id');
    
    if (data) {
      setBlockedUsers(new Set(data.map(b => b.user_id)));
    }
  };

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fraud_attempts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group attempts by user to count
      const userAttemptCounts = (data || []).reduce((acc, attempt) => {
        if (attempt.user_id) {
          acc[attempt.user_id] = (acc[attempt.user_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Get user details for each attempt
      const attemptsWithUsers = await Promise.all(
        (data || []).map(async (attempt) => {
          if (attempt.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, phone, email')
              .eq('user_id', attempt.user_id)
              .maybeSingle();
            
            return {
              ...attempt,
              user_name: profile?.full_name || 'غير معروف',
              user_phone: profile?.phone || 'غير متاح',
              user_email: profile?.email || 'غير متاح',
              attempt_count: userAttemptCounts[attempt.user_id] || 1,
              is_blocked: blockedUsers.has(attempt.user_id)
            };
          }
          return {
            ...attempt,
            user_name: 'غير معروف',
            user_phone: 'غير متاح',
            user_email: 'غير متاح',
            attempt_count: 1,
            is_blocked: false
          };
        })
      );

      setAttempts(attemptsWithUsers);
    } catch (error) {
      console.error('Error fetching fraud attempts:', error);
      toast.error('فشل في تحميل محاولات الاحتيال');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedUsers().then(() => fetchAttempts());
  }, []);

  // Calculate severity based on attempt type and count
  const calculateSeverity = (attemptType: string, count: number): SeverityLevel => {
    const highRiskTypes = ['duplicate_account', 'fake_referral'];
    const mediumRiskTypes = ['suspicious_transfer', 'multiple_devices'];
    
    if (highRiskTypes.includes(attemptType)) {
      if (count >= 3) return 'critical';
      return 'high';
    }
    
    if (mediumRiskTypes.includes(attemptType)) {
      if (count >= 5) return 'high';
      if (count >= 2) return 'medium';
    }
    
    if (count >= 10) return 'critical';
    if (count >= 5) return 'high';
    if (count >= 2) return 'medium';
    
    return 'low';
  };

  const getSeverityBadge = (severity: SeverityLevel) => {
    const config = {
      critical: { label: 'حرج', icon: ShieldX, className: 'bg-red-600 text-white' },
      high: { label: 'عالي', icon: ShieldAlert, className: 'bg-destructive text-destructive-foreground' },
      medium: { label: 'متوسط', icon: Shield, className: 'bg-orange-500 text-white' },
      low: { label: 'منخفض', icon: ShieldCheck, className: 'bg-muted text-muted-foreground' }
    };
    
    const { label, icon: Icon, className } = config[severity];
    return (
      <Badge className={className}>
        <Icon className="h-3 w-3 ml-1" />
        {label}
      </Badge>
    );
  };

  const getAttemptTypeBadge = (type: string) => {
    const types: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
      'duplicate_account': { label: 'حساب مكرر', variant: 'destructive' },
      'fake_referral': { label: 'إحالة وهمية', variant: 'destructive' },
      'suspicious_transfer': { label: 'تحويل مشبوه', variant: 'secondary' },
      'multiple_devices': { label: 'أجهزة متعددة', variant: 'outline' },
      'rate_limit_exceeded': { label: 'تجاوز الحد', variant: 'secondary' },
      'invalid_gift_card': { label: 'بطاقة غير صالحة', variant: 'outline' },
      'balance_manipulation': { label: 'تلاعب بالرصيد', variant: 'destructive' }
    };

    const config = types[type] || { label: type, variant: 'default' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleBlockUser = async () => {
    if (!selectedUser?.user_id || !user?.id) return;
    
    if (!blockReason.trim()) {
      toast.error('يرجى إدخال سبب الحظر');
      return;
    }

    setBlocking(true);
    try {
      const { data, error } = await supabase.rpc('block_fraudulent_users', {
        _user_ids: [selectedUser.user_id],
        _admin_id: user.id,
        _reason: blockReason.trim()
      });

      if (error) throw error;

      toast.success('تم حظر المستخدم بنجاح');
      setBlockDialogOpen(false);
      setBlockReason('');
      setSelectedUser(null);
      
      // Update local state
      setBlockedUsers(prev => new Set([...prev, selectedUser.user_id!]));
      fetchAttempts();
    } catch (error: any) {
      console.error('Error blocking user:', error);
      toast.error(error.message || 'فشل في حظر المستخدم');
    } finally {
      setBlocking(false);
    }
  };

  const handleViewUserDetails = async (attempt: FraudAttempt) => {
    if (!attempt.user_id) return;
    
    setLoadingDetails(true);
    setUserDetailsOpen(true);
    
    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', attempt.user_id)
        .maybeSingle();

      // Get all attempts for this user
      const { data: userAttempts } = await supabase
        .from('fraud_attempts')
        .select('*')
        .eq('user_id', attempt.user_id)
        .order('created_at', { ascending: false });

      const totalAttempts = userAttempts?.length || 0;
      const mostSevereType = userAttempts?.find(a => 
        ['duplicate_account', 'fake_referral'].includes(a.attempt_type)
      )?.attempt_type || userAttempts?.[0]?.attempt_type || 'unknown';

      setUserDetails({
        user_id: attempt.user_id,
        full_name: profile?.full_name || 'غير معروف',
        phone: profile?.phone || 'غير متاح',
        email: profile?.email || 'غير متاح',
        created_at: profile?.created_at || '',
        is_account_activated: profile?.is_account_activated || false,
        attempts: userAttempts || [],
        total_attempts: totalAttempts,
        severity: calculateSeverity(mostSevereType, totalAttempts)
      });
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('فشل في تحميل تفاصيل المستخدم');
    } finally {
      setLoadingDetails(false);
    }
  };

  const openBlockDialog = (attempt: FraudAttempt) => {
    setSelectedUser(attempt);
    setBlockReason(`محاولة احتيال: ${getAttemptTypeLabel(attempt.attempt_type)}`);
    setConfirmBlockOpen(true);
  };

  const getAttemptTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'duplicate_account': 'حساب مكرر',
      'fake_referral': 'إحالة وهمية',
      'suspicious_transfer': 'تحويل مشبوه',
      'multiple_devices': 'أجهزة متعددة',
      'rate_limit_exceeded': 'تجاوز الحد',
      'invalid_gift_card': 'بطاقة غير صالحة',
      'balance_manipulation': 'تلاعب بالرصيد'
    };
    return labels[type] || type;
  };

  const filteredAttempts = attempts.filter(attempt => 
    attempt.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attempt.user_phone?.includes(searchTerm) ||
    attempt.attempt_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attempt.ip_address?.includes(searchTerm)
  );

  // Group by user for repeat offenders
  const repeatOffenders = Object.entries(
    attempts.reduce((acc, attempt) => {
      if (attempt.user_id && !blockedUsers.has(attempt.user_id)) {
        if (!acc[attempt.user_id]) {
          acc[attempt.user_id] = {
            ...attempt,
            count: 1,
            types: new Set([attempt.attempt_type])
          };
        } else {
          acc[attempt.user_id].count++;
          acc[attempt.user_id].types.add(attempt.attempt_type);
        }
      }
      return acc;
    }, {} as Record<string, FraudAttempt & { count: number; types: Set<string> }>)
  )
    .filter(([_, data]) => data.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const stats = {
    total: attempts.length,
    today: attempts.filter(a => 
      new Date(a.created_at).toDateString() === new Date().toDateString()
    ).length,
    duplicateAccounts: attempts.filter(a => a.attempt_type === 'duplicate_account').length,
    fakeReferrals: attempts.filter(a => a.attempt_type === 'fake_referral').length,
    critical: attempts.filter(a => 
      calculateSeverity(a.attempt_type, a.attempt_count || 1) === 'critical'
    ).length,
    blocked: blockedUsers.size
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
              <div className="p-2 rounded-lg bg-red-600/10">
                <ShieldX className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.critical}</p>
                <p className="text-xs text-muted-foreground">حالات حرجة</p>
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

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Ban className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.blocked}</p>
                <p className="text-xs text-muted-foreground">محظورين</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Repeat Offenders Alert */}
      {repeatOffenders.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <Repeat className="h-5 w-5" />
              مكررو المحاولات - يحتاجون اهتمام فوري
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {repeatOffenders.map(([userId, data]) => {
                const severity = calculateSeverity(
                  Array.from(data.types)[0],
                  data.count
                );
                return (
                  <div 
                    key={userId}
                    className="flex items-center justify-between p-3 bg-background rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-destructive/10">
                        <User className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium">{data.user_name}</p>
                        <p className="text-sm text-muted-foreground" dir="ltr">
                          {data.user_phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <p className="font-bold text-destructive">{data.count} محاولات</p>
                        <p className="text-xs text-muted-foreground">
                          {Array.from(data.types).map(t => getAttemptTypeLabel(t)).join(', ')}
                        </p>
                      </div>
                      {getSeverityBadge(severity)}
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewUserDetails(data)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => openBlockDialog(data)}
                        >
                          <Ban className="h-4 w-4 ml-1" />
                          حظر
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
                    <TableHead className="text-right">الخطورة</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">IP</TableHead>
                    <TableHead className="text-right">المحاولات</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttempts.map((attempt) => {
                    const severity = calculateSeverity(
                      attempt.attempt_type, 
                      attempt.attempt_count || 1
                    );
                    const isBlocked = attempt.user_id && blockedUsers.has(attempt.user_id);
                    
                    return (
                      <TableRow 
                        key={attempt.id}
                        className={isBlocked ? 'opacity-50 bg-muted/30' : ''}
                      >
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(attempt.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                        </TableCell>
                        <TableCell>
                          {getSeverityBadge(severity)}
                        </TableCell>
                        <TableCell>
                          {getAttemptTypeBadge(attempt.attempt_type)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{attempt.user_name}</span>
                            {isBlocked && (
                              <Badge variant="outline" className="text-destructive border-destructive">
                                محظور
                              </Badge>
                            )}
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
                        <TableCell>
                          <Badge variant={attempt.attempt_count && attempt.attempt_count > 2 ? 'destructive' : 'secondary'}>
                            {attempt.attempt_count || 1}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleViewUserDetails(attempt)}
                              disabled={!attempt.user_id}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!isBlocked && attempt.user_id && (
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => openBlockDialog(attempt)}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={confirmBlockOpen} onOpenChange={setConfirmBlockOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              تأكيد حظر المستخدم
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حظر المستخدم <strong>{selectedUser?.user_name}</strong>؟
              <br />
              سيتم منعه من الوصول إلى النظام نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setConfirmBlockOpen(false);
                setBlockDialogOpen(true);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              متابعة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block User Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              حظر المستخدم
            </DialogTitle>
            <DialogDescription>
              سيتم حظر المستخدم <strong>{selectedUser?.user_name}</strong> من النظام.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">سبب الحظر</label>
              <Textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="أدخل سبب الحظر..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBlockUser}
              disabled={blocking || !blockReason.trim()}
            >
              {blocking ? (
                <RefreshCw className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Ban className="h-4 w-4 ml-2" />
              )}
              تأكيد الحظر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              تفاصيل المستخدم المشبوه
            </DialogTitle>
          </DialogHeader>
          
          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : userDetails ? (
            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">الاسم</p>
                  <p className="font-medium">{userDetails.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الهاتف</p>
                  <p className="font-medium" dir="ltr">{userDetails.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">البريد</p>
                  <p className="font-medium">{userDetails.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ التسجيل</p>
                  <p className="font-medium">
                    {userDetails.created_at ? format(new Date(userDetails.created_at), 'dd/MM/yyyy', { locale: ar }) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">حالة الحساب</p>
                  <Badge variant={userDetails.is_account_activated ? 'default' : 'secondary'}>
                    {userDetails.is_account_activated ? 'مفعل' : 'غير مفعل'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">مستوى الخطورة</p>
                  {getSeverityBadge(userDetails.severity)}
                </div>
              </div>

              {/* Attempts Summary */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  سجل المحاولات ({userDetails.total_attempts})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {userDetails.attempts.map((attempt) => (
                    <div key={attempt.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getAttemptTypeBadge(attempt.attempt_type)}
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(attempt.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground" dir="ltr">
                        {attempt.ip_address || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {!blockedUsers.has(userDetails.user_id) && (
                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      setUserDetailsOpen(false);
                      openBlockDialog({
                        ...userDetails.attempts[0],
                        user_name: userDetails.full_name,
                        user_phone: userDetails.phone
                      });
                    }}
                  >
                    <Ban className="h-4 w-4 ml-2" />
                    حظر هذا المستخدم
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>فشل في تحميل التفاصيل</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FraudAttempts;
