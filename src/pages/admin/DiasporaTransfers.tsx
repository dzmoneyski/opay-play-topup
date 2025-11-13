import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Globe2, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Calendar,
  User,
  CreditCard,
  FileText,
  Loader2,
  Settings,
  Save,
  Copy,
  Trash2,
  Plus,
  Landmark,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface DiasporaTransfer {
  id: string;
  sender_id: string;
  amount: number;
  sender_country: string;
  sender_city: string | null;
  payment_method: string | null;
  transaction_reference: string | null;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  exchange_rate: number | null;
  amount_dzd: number | null;
  created_at: string;
  processed_at: string | null;
  profiles: {
    full_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
}

const DiasporaTransfers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTransfer, setSelectedTransfer] = useState<DiasporaTransfer | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [defaultExchangeRate, setDefaultExchangeRate] = useState(280);
  
  const [approvalData, setApprovalData] = useState({
    exchangeRate: '280',
    adminNotes: ''
  });
  
  const [rejectionReason, setRejectionReason] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Diaspora settings state
  const [diasporaSettings, setDiasporaSettings] = useState({
    enabled: true,
    default_exchange_rate: 280,
    bank_accounts: [
      {
        id: '1',
        name: 'Revolut',
        account_name: 'OpaY Services',
        account_number: 'GB29 REVO 0099 6900 1234 56',
        bic: 'REVOGB21',
        currency: 'EUR/USD',
        color: 'from-[#0075EB] to-[#00C6FF]',
        icon: 'CreditCard'
      },
      {
        id: '2',
        name: 'Wise',
        account_name: 'OpaY International',
        account_number: 'BE68 5390 0754 7034',
        bic: 'TRWIBEB1XXX',
        currency: 'EUR/USD',
        color: 'from-[#9FE870] to-[#37B45B]',
        icon: 'Landmark'
      },
      {
        id: '3',
        name: 'Paysera',
        account_name: 'OpaY Transfer',
        account_number: 'LT12 3456 7890 1234 5678',
        bic: 'EVIULT2VXXX',
        currency: 'EUR',
        color: 'from-[#FF6B35] to-[#F7931E]',
        icon: 'CreditCard'
      },
      {
        id: '4',
        name: 'SEPA',
        account_name: 'OpaY Europe',
        account_number: 'FR76 3000 4000 0100 0000 0000 001',
        bic: 'BNPAFRPPXXX',
        currency: 'EUR',
        color: 'from-[#003399] to-[#0066CC]',
        icon: 'Landmark'
      },
      {
        id: '5',
        name: 'Bank Transfer',
        account_name: 'OpaY Financial',
        account_number: 'DE89 3704 0044 0532 0130 00',
        bic: 'COBADEFFXXX',
        currency: 'EUR/USD',
        color: 'from-[#6366F1] to-[#8B5CF6]',
        icon: 'Landmark'
      }
    ]
  });

  const [newAccount, setNewAccount] = useState({
    name: '',
    account_name: '',
    account_number: '',
    bic: '',
    currency: 'EUR/USD',
    color: 'from-[#6366F1] to-[#8B5CF6]',
    icon: 'CreditCard'
  });
  
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  // Load default exchange rate from settings
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('platform_settings')
          .select('setting_value')
          .eq('setting_key', 'diaspora_settings')
          .single();

        if (error) throw error;

        if (data?.setting_value) {
          const settings = data.setting_value as any;
          setDiasporaSettings(settings);
          if (settings.default_exchange_rate) {
            const rate = settings.default_exchange_rate;
            setDefaultExchangeRate(rate);
            setApprovalData(prev => ({ ...prev, exchangeRate: rate.toString() }));
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Fetch diaspora transfers
  const { data: transfers, isLoading } = useQuery({
    queryKey: ['admin-diaspora-transfers', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('diaspora_transfers')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: transfersData, error } = await query;
      if (error) throw error;

      // Fetch profiles separately
      const userIds = transfersData?.map(t => t.sender_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, email')
        .in('user_id', userIds);

      // Map profiles to transfers
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      
      return transfersData?.map(transfer => ({
        ...transfer,
        profiles: profilesMap.get(transfer.sender_id) || null
      })) as DiasporaTransfer[];
    }
  });

  // Approve transfer mutation
  const approveMutation = useMutation({
    mutationFn: async ({ transferId, exchangeRate, adminNotes }: { 
      transferId: string; 
      exchangeRate: number;
      adminNotes: string;
    }) => {
      const transfer = transfers?.find(t => t.id === transferId);
      if (!transfer) throw new Error('Transfer not found');

      const amountDzd = transfer.amount * exchangeRate;

      // Update transfer status
      const { error: updateError } = await supabase
        .from('diaspora_transfers')
        .update({
          status: 'approved',
          exchange_rate: exchangeRate,
          amount_dzd: amountDzd,
          admin_notes: adminNotes,
          processed_at: new Date().toISOString()
        })
        .eq('id', transferId);

      if (updateError) throw updateError;

      // Add deposit to credit user account
      const { error: depositError } = await supabase
        .from('deposits')
        .insert({
          user_id: transfer.sender_id,
          amount: amountDzd,
          payment_method: 'diaspora_transfer',
          status: 'approved',
          admin_notes: `تحويل من الجالية - ${transfer.sender_country}`,
          processed_at: new Date().toISOString()
        });

      if (depositError) throw depositError;

      // Update user balance
      const { error: balanceError } = await supabase.rpc('recalculate_user_balance', {
        _user_id: transfer.sender_id
      });

      if (balanceError) throw balanceError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-diaspora-transfers'] });
      toast({
        title: "تمت الموافقة بنجاح",
        description: "تم شحن رصيد المستخدم",
      });
      setShowApprovalDialog(false);
      setSelectedTransfer(null);
      setApprovalData({ exchangeRate: '280', adminNotes: '' });
    },
    onError: (error) => {
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Reject transfer mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ transferId, reason }: { transferId: string; reason: string }) => {
      const { error } = await supabase
        .from('diaspora_transfers')
        .update({
          status: 'rejected',
          admin_notes: reason,
          processed_at: new Date().toISOString()
        })
        .eq('id', transferId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-diaspora-transfers'] });
      toast({
        title: "تم الرفض",
        description: "تم رفض طلب التحويل",
      });
      setShowRejectionDialog(false);
      setSelectedTransfer(null);
      setRejectionReason('');
    },
    onError: (error) => {
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleApprove = (transfer: DiasporaTransfer) => {
    setSelectedTransfer(transfer);
    setApprovalData({
      exchangeRate: defaultExchangeRate.toString(),
      adminNotes: ''
    });
    setShowApprovalDialog(true);
  };

  const handleReject = (transfer: DiasporaTransfer) => {
    setSelectedTransfer(transfer);
    setShowRejectionDialog(true);
  };

  const confirmApproval = () => {
    if (!selectedTransfer) return;
    
    const exchangeRate = parseFloat(approvalData.exchangeRate);
    if (isNaN(exchangeRate) || exchangeRate <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال سعر صرف صحيح",
        variant: "destructive"
      });
      return;
    }

    approveMutation.mutate({
      transferId: selectedTransfer.id,
      exchangeRate,
      adminNotes: approvalData.adminNotes
    });
  };

  const confirmRejection = () => {
    if (!selectedTransfer || !rejectionReason.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال سبب الرفض",
        variant: "destructive"
      });
      return;
    }

    rejectMutation.mutate({
      transferId: selectedTransfer.id,
      reason: rejectionReason
    });
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          setting_key: 'diaspora_settings',
          setting_value: diasporaSettings as any,
          description: 'إعدادات خدمة الجالية والحسابات البنكية'
        }, { onConflict: 'setting_key' });
      
      if (error) throw error;

      toast({
        title: "تم الحفظ بنجاح",
        description: "تم حفظ إعدادات الجالية",
      });

      // Update default exchange rate
      setDefaultExchangeRate(diasporaSettings.default_exchange_rate);
      setApprovalData(prev => ({ ...prev, exchangeRate: diasporaSettings.default_exchange_rate.toString() }));
      
      // Refresh transfers
      queryClient.invalidateQueries({ queryKey: ['admin-diaspora-transfers'] });
    } catch (error: any) {
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "تم النسخ",
      description: `تم نسخ ${label} بنجاح`,
    });
  };

  const handleAddAccount = () => {
    if (!newAccount.name || !newAccount.account_name || !newAccount.account_number || !newAccount.bic) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    const account = {
      ...newAccount,
      id: Date.now().toString()
    };

    setDiasporaSettings(prev => ({
      ...prev,
      bank_accounts: [...prev.bank_accounts, account]
    }));

    setNewAccount({
      name: '',
      account_name: '',
      account_number: '',
      bic: '',
      currency: 'EUR/USD',
      color: 'from-[#6366F1] to-[#8B5CF6]',
      icon: 'CreditCard'
    });
    
    setShowAddAccountDialog(false);
    
    toast({
      title: "تم الإضافة",
      description: "تم إضافة الحساب البنكي بنجاح",
    });
  };

  const handleDeleteAccount = (accountId: string) => {
    setDiasporaSettings(prev => ({
      ...prev,
      bank_accounts: prev.bank_accounts.filter(acc => acc.id !== accountId)
    }));
    
    toast({
      title: "تم الحذف",
      description: "تم حذف الحساب البنكي",
    });
  };

  const handleUpdateAccount = (accountId: string, field: string, value: string) => {
    setDiasporaSettings(prev => ({
      ...prev,
      bank_accounts: prev.bank_accounts.map(acc => 
        acc.id === accountId ? { ...acc, [field]: value } : acc
      )
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">قيد المراجعة</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">مقبول</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">مرفوض</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string | null) => {
    const methods: Record<string, string> = {
      'revolut': 'Revolut',
      'wise': 'Wise',
      'paysera': 'Paysera',
      'bank_transfer': 'Bank Transfer',
      'western_union': 'Western Union',
      'other': 'أخرى'
    };
    return methods[method || ''] || method || '-';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = transfers?.filter(t => t.status === 'pending').length || 0;
  const approvedCount = transfers?.filter(t => t.status === 'approved').length || 0;
  const rejectedCount = transfers?.filter(t => t.status === 'rejected').length || 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Globe2 className="w-8 h-8 text-primary" />
          إدارة طلبات الجالية
        </h1>
        <p className="text-muted-foreground mt-2">
          إدارة طلبات تحويلات الجالية الجزائرية في الخارج والإعدادات
        </p>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="requests">
            <FileText className="w-4 h-4 ml-2" />
            الطلبات
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 ml-2" />
            الإعدادات
          </TabsTrigger>
        </TabsList>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-6"  >

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">الإجمالي</p>
                <p className="text-2xl font-bold">{transfers?.length || 0}</p>
              </div>
              <Globe2 className="w-8 h-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">قيد المراجعة</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <FileText className="w-8 h-8 text-yellow-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">مقبول</p>
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">مرفوض</p>
                <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Label>تصفية حسب الحالة:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="pending">قيد المراجعة</SelectItem>
                <SelectItem value="approved">مقبول</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transfers Table */}
      <Card>
        <CardHeader>
          <CardTitle>طلبات التحويل</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الدولة</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>المرجع</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      لا توجد طلبات
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers?.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {transfer.profiles?.full_name || 'غير محدد'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {transfer.profiles?.phone || transfer.profiles?.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="font-bold">{transfer.amount}</span>
                        </div>
                        {transfer.amount_dzd && (
                          <span className="text-xs text-muted-foreground">
                            ({transfer.amount_dzd.toLocaleString()} دج)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{transfer.sender_country}</span>
                          {transfer.sender_city && (
                            <span className="text-xs text-muted-foreground">{transfer.sender_city}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getPaymentMethodLabel(transfer.payment_method)}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                          {transfer.transaction_reference || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {format(new Date(transfer.created_at), 'dd MMM yyyy', { locale: ar })}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell>
                        {transfer.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(transfer)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(transfer)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        {transfer.status !== 'pending' && (
                          <span className="text-sm text-muted-foreground">
                            {transfer.admin_notes || '-'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          {/* Service Enable/Disable */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                الإعدادات العامة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label>تفعيل خدمة الجالية</Label>
                  <p className="text-sm text-muted-foreground">
                    السماح بتحويلات الجالية الجزائرية من الخارج
                  </p>
                </div>
                <Switch
                  checked={diasporaSettings.enabled}
                  onCheckedChange={(checked) => setDiasporaSettings(prev => ({ ...prev, enabled: checked }))}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="default_exchange_rate">سعر الصرف الافتراضي (1 USD/EUR = ... DZD)</Label>
                <Input
                  id="default_exchange_rate"
                  type="number"
                  step="0.01"
                  value={diasporaSettings.default_exchange_rate}
                  onChange={(e) => setDiasporaSettings(prev => ({ 
                    ...prev, 
                    default_exchange_rate: parseFloat(e.target.value) || 0 
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  سيتم استخدام هذا السعر كقيمة افتراضية عند الموافقة على الطلبات
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bank Accounts List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-primary" />
                  الحسابات البنكية
                </CardTitle>
                <Button onClick={() => setShowAddAccountDialog(true)} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  إضافة حساب جديد
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {diasporaSettings.bank_accounts.map((account) => (
                <Card key={account.id} className="relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${account.color}`} />
                  <CardContent className="pt-6 pr-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-lg">{account.name}</h4>
                        <Badge variant="outline" className="mt-1">{account.currency}</Badge>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteAccount(account.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">اسم الحساب</Label>
                        <div className="flex gap-2">
                          <Input
                            value={account.account_name}
                            onChange={(e) => handleUpdateAccount(account.id, 'account_name', e.target.value)}
                            className="text-sm"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => copyToClipboard(account.account_name, 'اسم الحساب')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">رقم الحساب / IBAN</Label>
                        <div className="flex gap-2">
                          <Input
                            value={account.account_number}
                            onChange={(e) => handleUpdateAccount(account.id, 'account_number', e.target.value)}
                            className="font-mono text-sm"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => copyToClipboard(account.account_number, 'رقم الحساب')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">BIC / SWIFT</Label>
                        <div className="flex gap-2">
                          <Input
                            value={account.bic}
                            onChange={(e) => handleUpdateAccount(account.id, 'bic', e.target.value)}
                            className="font-mono text-sm"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => copyToClipboard(account.bic, 'BIC')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">العملة</Label>
                        <Input
                          value={account.currency}
                          onChange={(e) => handleUpdateAccount(account.id, 'currency', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {diasporaSettings.bank_accounts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Landmark className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>لا توجد حسابات بنكية. قم بإضافة حساب جديد.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveSettings}
              disabled={savingSettings}
              size="lg"
              className="gap-2"
            >
              {savingSettings ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  حفظ الإعدادات
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Account Dialog */}
      <Dialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إضافة حساب بنكي جديد</DialogTitle>
            <DialogDescription>
              أدخل معلومات الحساب البنكي الجديد
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new_bank_name">اسم البنك / المحفظة *</Label>
                <Input
                  id="new_bank_name"
                  placeholder="مثال: Western Union"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_currency">العملة *</Label>
                <Input
                  id="new_currency"
                  placeholder="EUR/USD"
                  value={newAccount.currency}
                  onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_account_name">اسم الحساب *</Label>
              <Input
                id="new_account_name"
                placeholder="مثال: OpaY Services"
                value={newAccount.account_name}
                onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_account_number">رقم الحساب / IBAN *</Label>
              <Input
                id="new_account_number"
                placeholder="مثال: GB29 REVO 0099 6900 1234 56"
                value={newAccount.account_number}
                onChange={(e) => setNewAccount({ ...newAccount, account_number: e.target.value })}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_bic">BIC / SWIFT *</Label>
              <Input
                id="new_bic"
                placeholder="مثال: REVOGB21"
                value={newAccount.bic}
                onChange={(e) => setNewAccount({ ...newAccount, bic: e.target.value })}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_color">اللون (Tailwind Gradient)</Label>
              <Select
                value={newAccount.color}
                onValueChange={(value) => setNewAccount({ ...newAccount, color: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="from-[#0075EB] to-[#00C6FF]">أزرق (Revolut)</SelectItem>
                  <SelectItem value="from-[#9FE870] to-[#37B45B]">أخضر (Wise)</SelectItem>
                  <SelectItem value="from-[#FF6B35] to-[#F7931E]">برتقالي (Paysera)</SelectItem>
                  <SelectItem value="from-[#003399] to-[#0066CC]">أزرق داكن (SEPA)</SelectItem>
                  <SelectItem value="from-[#6366F1] to-[#8B5CF6]">بنفسجي</SelectItem>
                  <SelectItem value="from-[#FFCC00] to-[#FF9900]">ذهبي</SelectItem>
                  <SelectItem value="from-[#EC4899] to-[#F43F5E]">وردي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_icon">الأيقونة</Label>
              <Select
                value={newAccount.icon}
                onValueChange={(value) => setNewAccount({ ...newAccount, icon: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CreditCard">بطاقة ائتمان</SelectItem>
                  <SelectItem value="Landmark">بنك</SelectItem>
                  <SelectItem value="Send">إرسال</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAccountDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAddAccount} className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة الحساب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>الموافقة على التحويل</DialogTitle>
            <DialogDescription>
              قم بإدخال سعر الصرف لتحويل المبلغ إلى الدينار الجزائري
            </DialogDescription>
          </DialogHeader>

          {selectedTransfer && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">المستخدم:</span>
                  <span className="font-medium">{selectedTransfer.profiles?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">المبلغ:</span>
                  <span className="font-bold text-lg">${selectedTransfer.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">الدولة:</span>
                  <span>{selectedTransfer.sender_country}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="exchangeRate">سعر الصرف (1 USD = ... DZD)</Label>
                <Input
                  id="exchangeRate"
                  type="number"
                  placeholder="280"
                  value={approvalData.exchangeRate}
                  onChange={(e) => setApprovalData({ ...approvalData, exchangeRate: e.target.value })}
                  step="0.01"
                  className="mt-2"
                />
              </div>

              {approvalData.exchangeRate && (
                <div className="bg-primary/5 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">المبلغ بالدينار:</p>
                  <p className="text-2xl font-bold text-primary">
                    {(selectedTransfer.amount * parseFloat(approvalData.exchangeRate || '0')).toLocaleString()} دج
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="adminNotes">ملاحظات (اختياري)</Label>
                <Textarea
                  id="adminNotes"
                  placeholder="أي ملاحظات إضافية..."
                  value={approvalData.adminNotes}
                  onChange={(e) => setApprovalData({ ...approvalData, adminNotes: e.target.value })}
                  rows={3}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={confirmApproval}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 ml-2" />
                  تأكيد الموافقة
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض التحويل</DialogTitle>
            <DialogDescription>
              يرجى إدخال سبب رفض هذا الطلب
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">سبب الرفض *</Label>
              <Textarea
                id="rejectionReason"
                placeholder="مثال: معلومات التحويل غير مطابقة"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              إلغاء
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmRejection}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الرفض...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 ml-2" />
                  تأكيد الرفض
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiasporaTransfers;
