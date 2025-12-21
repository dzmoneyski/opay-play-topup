import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
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
  AlertCircle,
  User,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  Gift,
  Gamepad2,
  TrendingUp,
  Package,
  CreditCard
} from 'lucide-react';
import { useTransactionHistory, TransactionHistoryItem } from '@/hooks/useTransactionHistory';
import { toast } from 'sonner';

// Helper component to get transaction icon
const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'deposit': return <ArrowDownLeft className="h-4 w-4" />;
    case 'withdrawal': return <ArrowUpRight className="h-4 w-4" />;
    case 'transfer_sent': return <Send className="h-4 w-4" />;
    case 'transfer_received': return <ArrowDownLeft className="h-4 w-4" />;
    case 'gift_card': return <Gift className="h-4 w-4" />;
    case 'betting': return <TrendingUp className="h-4 w-4" />;
    case 'game_topup': return <Gamepad2 className="h-4 w-4" />;
    case 'digital_card': return <CreditCard className="h-4 w-4" />;
    default: return <Package className="h-4 w-4" />;
  }
};

const getTransactionColor = (amount: number) => {
  return amount > 0 ? 'text-green-600' : 'text-red-600';
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'completed': return 'default';
    case 'pending': return 'secondary';
    case 'rejected': return 'destructive';
    default: return 'outline';
  }
};

// User Transactions Tab Component
const UserTransactionsTab = ({ userId }: { userId: string }) => {
  // Create a temporary auth context for this user
  const { transactions, loading } = useTransactionHistory();
  
  // Filter transactions for this specific user
  const [userTransactions, setUserTransactions] = React.useState<TransactionHistoryItem[]>([]);
  
  React.useEffect(() => {
    const fetchUserTransactions = async () => {
      try {
        // Fetch limited transaction types for this user (last 50 of each)
        const limit = 50;
        const [deposits, withdrawals, transfers, giftCards, betting, gameTopups, digitalCards] = await Promise.all([
          supabase.from('deposits').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit),
          supabase.from('withdrawals').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit),
          supabase.from('transfers').select('*, transaction_number').or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).order('created_at', { ascending: false }).limit(limit),
          // جلب بطاقات الهدايا المفعلة من هذا المستخدم مباشرة
          supabase.from('gift_cards').select('id, amount, used_at, card_code').eq('used_by', userId).eq('is_used', true).order('used_at', { ascending: false }).limit(limit),
          supabase.from('betting_transactions').select('*, platform:game_platforms(name, name_ar)').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit),
          supabase.from('game_topup_orders').select('*, platform:game_platforms(name, name_ar)').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit),
          // جلب طلبات البطاقات الرقمية
          supabase.from('digital_card_orders').select('*, card_type:digital_card_types(name, name_ar)').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit)
        ]);

        const allTransactions: TransactionHistoryItem[] = [];

        // Process deposits
        deposits.data?.forEach(deposit => {
          allTransactions.push({
            id: deposit.id,
            type: 'deposit',
            description: `إيداع عبر ${deposit.payment_method === 'baridimob' ? 'بريدي موب' : deposit.payment_method === 'ccp' ? 'حساب جاري بريدي' : 'الذهبية'}`,
            amount: Number(deposit.amount),
            status: deposit.status,
            created_at: deposit.created_at,
            icon_type: 'plus'
          });
        });

        // Process transfers
        transfers.data?.forEach(transfer => {
          const isSender = transfer.sender_id === userId;
          allTransactions.push({
            id: transfer.id,
            type: isSender ? 'transfer_sent' : 'transfer_received',
            description: isSender ? `تحويل إلى ${transfer.recipient_phone}` : `تحويل من ${transfer.sender_phone}`,
            amount: isSender ? -Number(transfer.amount) : Number(transfer.amount),
            status: transfer.status,
            created_at: transfer.created_at,
            icon_type: isSender ? 'send' : 'receive',
            transaction_number: transfer.transaction_number
          });
        });

        // Process withdrawals
        withdrawals.data?.forEach(withdrawal => {
          allTransactions.push({
            id: withdrawal.id,
            type: 'withdrawal',
            description: `سحب عبر ${withdrawal.withdrawal_method === 'bank' ? 'البنك' : 'نقداً'}`,
            amount: -Number(withdrawal.amount),
            status: withdrawal.status,
            created_at: withdrawal.created_at,
            icon_type: 'withdraw'
          });
        });

        // Process gift cards - الآن نجلب البطاقات مباشرة للمستخدم المحدد
        if (giftCards.data) {
          giftCards.data.forEach((card: any) => {
            allTransactions.push({
              id: card.id,
              type: 'gift_card',
              description: `تفعيل بطاقة OpaY`,
              amount: Number(card.amount),
              status: 'completed',
              created_at: card.used_at,
              icon_type: 'gift'
            });
          });
        }

        // Process digital card orders
        if (digitalCards.data) {
          digitalCards.data.forEach((order: any) => {
            const cardName = order.card_type?.name_ar || 'بطاقة رقمية';
            allTransactions.push({
              id: order.id,
              type: 'digital_card',
              description: `طلب ${cardName} ($${order.amount_usd})`,
              amount: -Number(order.total_dzd),
              status: order.status,
              created_at: order.created_at,
              icon_type: 'card'
            });
          });
        }

        // Process betting transactions
        betting.data?.forEach(transaction => {
          const platformName = (transaction as any).platform?.name_ar || 'منصة مراهنات';
          const typeText = transaction.transaction_type === 'deposit' ? 'إيداع' : 'سحب';
          allTransactions.push({
            id: transaction.id,
            type: 'betting',
            description: `${typeText} على ${platformName}`,
            amount: transaction.transaction_type === 'deposit' ? -Number(transaction.amount) : Number(transaction.amount),
            status: transaction.status,
            created_at: transaction.created_at,
            icon_type: transaction.transaction_type === 'deposit' ? 'send' : 'receive'
          });
        });

        // Process game topup orders
        gameTopups.data?.forEach(order => {
          const platformName = (order as any).platform?.name_ar || 'لعبة';
          allTransactions.push({
            id: order.id,
            type: 'game_topup',
            description: `شحن ${platformName}`,
            amount: -Number(order.amount),
            status: order.status,
            created_at: order.created_at,
            icon_type: 'game'
          });
        });

        // Sort by date
        allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setUserTransactions(allTransactions);
      } catch (error) {
        console.error('Error fetching user transactions:', error);
      }
    };

    fetchUserTransactions();
  }, [userId]);

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
    }).format(Math.abs(amount));
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'مكتمل';
      case 'pending': return 'قيد الانتظار';
      case 'rejected': return 'مرفوض';
      case 'processing': return 'قيد المعالجة';
      default: return status;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل المعاملات الكامل</CardTitle>
        <CardDescription>
          جميع الحركات والمعاملات التي تمت على الحساب ({userTransactions.length} معاملة)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {userTransactions.length > 0 ? (
          <div className="space-y-2">
            {userTransactions.map((transaction, index) => (
              <div 
                key={transaction.id || index} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.amount > 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{transaction.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.created_at)}
                      </p>
                      {transaction.transaction_number && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <p className="text-xs font-mono text-muted-foreground">
                            {transaction.transaction_number}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <p className={`font-bold text-sm ${getTransactionColor(transaction.amount)}`}>
                      {transaction.amount > 0 ? '+' : ''}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <Badge 
                      variant={getStatusBadgeVariant(transaction.status)} 
                      className="text-xs mt-1"
                    >
                      {getStatusText(transaction.status)}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg font-medium">لا توجد معاملات</p>
            <p className="text-muted-foreground text-sm mt-2">لم يقم المستخدم بأي معاملات حتى الآن</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// User Details Modal Component
const UserDetailsModal = ({ user, onUpdate }: { user: any; onUpdate: () => void }) => {
  const [activeTab, setActiveTab] = React.useState('profile');
  const [verificationRequest, setVerificationRequest] = React.useState<any>(null);
  const [balanceAction, setBalanceAction] = React.useState({ type: '', amount: '', note: '' });
  const [processing, setProcessing] = React.useState(false);
  const [heldBalance, setHeldBalance] = React.useState(0);

  React.useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        // Fetch verification request
        const { data: verificationData } = await supabase
          .from('verification_requests')
          .select('*')
          .eq('user_id', user.user_id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (verificationData?.[0]) {
          setVerificationRequest(verificationData[0]);
        }

        // Calculate held balance from pending orders
        const [gameOrders, bettingTransactions, withdrawals] = await Promise.all([
          supabase.from('game_topup_orders').select('amount').eq('user_id', user.user_id).eq('status', 'pending'),
          supabase.from('betting_transactions').select('amount').eq('user_id', user.user_id).eq('transaction_type', 'deposit').eq('status', 'pending'),
          supabase.from('withdrawals').select('amount').eq('user_id', user.user_id).in('status', ['pending', 'approved'])
        ]);

        const totalHeld = 
          (gameOrders.data?.reduce((sum, o) => sum + Number(o.amount), 0) || 0) +
          (bettingTransactions.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0) +
          (withdrawals.data?.reduce((sum, w) => sum + Number(w.amount), 0) || 0);

        setHeldBalance(totalHeld);
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    };

    fetchUserDetails();
  }, [user.user_id]);

  const handleBalanceAction = async () => {
    if (!balanceAction.amount || Number(balanceAction.amount) <= 0 || !balanceAction.type) return;

    setProcessing(true);
    try {
      const amount = Number(balanceAction.amount);
      const delta = balanceAction.type === 'add' ? amount : -amount;

      const { data, error } = await supabase.rpc('admin_adjust_balance', {
        _target_user: user.user_id,
        _amount: delta,
        _note: balanceAction.note || `تعديل رصيد من الإدارة (${balanceAction.type === 'add' ? 'إضافة' : 'خصم'})`
      });

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      const result = data as { success?: boolean; new_balance?: number };
      if (result?.success) {
        console.log('تم تحديث الرصيد بنجاح:', result);
        alert(`تم ${balanceAction.type === 'add' ? 'إضافة' : 'خصم'} ${amount} دج بنجاح. الرصيد الحالي: ${result.new_balance} دج`);
        setBalanceAction({ type: '', amount: '', note: '' });
        onUpdate();
      } else {
        throw new Error('فشل في تحديث الرصيد');
      }
    } catch (error: any) {
      console.error('Error adjusting balance:', error);
      alert(`خطأ في تحديث الرصيد: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleAccountAction = async (action: 'activate' | 'suspend' | 'block') => {
    setProcessing(true);
    try {
      if (action === 'activate') {
        // Use new admin_activate_account function with referral warning
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) throw new Error('غير مصرح');

        const { data, error } = await supabase.rpc('admin_activate_account', {
          _user_id: user.user_id,
          _admin_id: currentUser.id,
        });

        if (error) throw error;

        const result = data as { 
          success: boolean; 
          error?: string; 
          message?: string; 
          has_referral?: boolean; 
          referrer_name?: string;
        };

        if (!result.success) {
          toast.error(result.error || 'حدث خطأ');
          return;
        }


        toast.success(result.message || 'تم تفعيل الحساب');
      } else {
        // Suspend or block
        const updates: any = {
          is_account_activated: false
        };

        await supabase
          .from('profiles')
          .update(updates)
          .eq('user_id', user.user_id);

        toast.success(action === 'suspend' ? 'تم تعليق الحساب' : 'تم حظر الحساب');
      }

      onUpdate();
    } catch (error: any) {
      console.error('Error updating account:', error);
      toast.error(error.message || 'فشل تحديث الحساب');
    } finally {
      setProcessing(false);
    }
  };

  const handleRoleChange = async (newRole: 'admin' | 'user') => {
    if (!confirm(`هل أنت متأكد من تغيير الصلاحية إلى "${newRole === 'admin' ? 'مشرف' : 'مستخدم'}"؟`)) {
      return;
    }

    setProcessing(true);
    try {
      // حذف الصلاحية الحالية
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.user_id);

      // إضافة الصلاحية الجديدة
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.user_id,
          role: newRole
        });

      if (error) throw error;

      alert(`تم تغيير الصلاحية بنجاح إلى "${newRole === 'admin' ? 'مشرف' : 'مستخدم'}"`);
      onUpdate();
    } catch (error: any) {
      console.error('Error changing role:', error);
      alert(`خطأ في تغيير الصلاحية: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    const { data } = supabase.storage.from('identity-documents').getPublicUrl(imagePath);
    return data.publicUrl;
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
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-border">
        <div className="flex space-x-8 space-x-reverse">
          {[
            { id: 'profile', label: 'المعلومات الشخصية', icon: User },
            { id: 'verification', label: 'التحقق من الهوية', icon: Shield },
            { id: 'balance', label: 'إدارة الرصيد', icon: CheckCircle },
            { id: 'transactions', label: 'سجل المعاملات', icon: Calendar },
            { id: 'actions', label: 'إجراءات الحساب', icon: AlertCircle }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>المعلومات الأساسية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الاسم الكامل:</span>
                  <span className="font-medium">{user.full_name || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">رقم الهاتف:</span>
                  <span className="font-medium">{user.phone || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">البريد الإلكتروني:</span>
                  <span className="font-medium">{user.email || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تاريخ التسجيل:</span>
                  <span className="font-medium">{formatDate(user.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">معرف المستخدم:</span>
                  <span className="font-mono text-xs">{user.user_id}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>حالة الحساب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">الهاتف موثق:</span>
                  <Badge variant={user.is_phone_verified ? "default" : "secondary"}>
                    {user.is_phone_verified ? "نعم" : "لا"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">الهوية موثقة:</span>
                  <Badge variant={user.is_identity_verified ? "default" : "secondary"}>
                    {user.is_identity_verified ? "نعم" : "لا"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">الحساب مفعل:</span>
                  <Badge variant={user.is_account_activated ? "default" : "destructive"}>
                    {user.is_account_activated ? "مفعل" : "غير مفعل"}
                  </Badge>
                </div>
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الرصيد الإجمالي:</span>
                    <span className="font-bold text-lg text-primary">
                      {formatCurrency(user.balance)}
                    </span>
                  </div>
                  {heldBalance > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-600">محجوز (طلبات معلقة):</span>
                        <span className="font-semibold text-orange-600">
                          -{formatCurrency(heldBalance)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="text-green-600 font-medium">المتاح للاستخدام:</span>
                        <span className="font-bold text-lg text-green-600">
                          {formatCurrency(Math.max(0, user.balance - heldBalance))}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-muted-foreground">عدد المعاملات:</span>
                  <span className="font-medium">{user.total_transactions}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="space-y-6">
            {verificationRequest ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    طلب التحقق من الهوية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">معلومات الطلب</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">رقم الهوية:</span>
                          <span className="font-medium">{verificationRequest.national_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">تاريخ التقديم:</span>
                          <span className="font-medium">{formatDate(verificationRequest.submitted_at)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">الحالة:</span>
                          <Badge variant={
                            verificationRequest.status === 'approved' ? "default" :
                            verificationRequest.status === 'rejected' ? "destructive" : "secondary"
                          }>
                            {verificationRequest.status === 'approved' ? 'مقبول' :
                             verificationRequest.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {verificationRequest.full_name_on_id && (
                      <div>
                        <h4 className="font-medium mb-2">بيانات البطاقة</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">الاسم في البطاقة:</span>
                            <span className="font-medium">{verificationRequest.full_name_on_id}</span>
                          </div>
                          {verificationRequest.date_of_birth && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">تاريخ الميلاد:</span>
                              <span className="font-medium">
                                {new Date(verificationRequest.date_of_birth).toLocaleDateString('ar-DZ')}
                              </span>
                            </div>
                          )}
                          {verificationRequest.place_of_birth && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">مكان الميلاد:</span>
                              <span className="font-medium">{verificationRequest.place_of_birth}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Document Images */}
                  {(verificationRequest.national_id_front_image || verificationRequest.national_id_back_image) && (
                    <div>
                      <h4 className="font-medium mb-4">صور المستندات</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {verificationRequest.national_id_front_image && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">الوجه الأمامي</p>
                            <img 
                              src={getImageUrl(verificationRequest.national_id_front_image) || ''} 
                              alt="الوجه الأمامي للهوية"
                              className="w-full max-h-48 object-contain border rounded-md bg-gray-50 cursor-pointer"
                              onClick={() => window.open(getImageUrl(verificationRequest.national_id_front_image) || '', '_blank')}
                            />
                          </div>
                        )}
                        
                        {verificationRequest.national_id_back_image && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">الوجه الخلفي</p>
                            <img 
                              src={getImageUrl(verificationRequest.national_id_back_image) || ''} 
                              alt="الوجه الخلفي للهوية"
                              className="w-full max-h-48 object-contain border rounded-md bg-gray-50 cursor-pointer"
                              onClick={() => window.open(getImageUrl(verificationRequest.national_id_back_image) || '', '_blank')}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {verificationRequest.address && (
                    <div>
                      <h4 className="font-medium mb-2">العنوان</h4>
                      <p className="text-sm bg-muted/30 p-3 rounded">{verificationRequest.address}</p>
                    </div>
                  )}

                  {verificationRequest.status === 'rejected' && verificationRequest.rejection_reason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <h4 className="font-medium text-red-900 mb-1">سبب الرفض</h4>
                      <p className="text-sm text-red-800">{verificationRequest.rejection_reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">لا يوجد طلب تحقق</h3>
                  <p className="text-muted-foreground">لم يقدم هذا المستخدم طلب التحقق من الهوية بعد</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'balance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>الرصيد الحالي</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {formatCurrency(user.balance)}
                  </div>
                  <p className="text-sm text-muted-foreground">الرصيد المتاح للمستخدم</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>تعديل الرصيد</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={balanceAction.type === 'add' ? 'default' : 'outline'}
                    onClick={() => setBalanceAction(prev => ({ ...prev, type: 'add' }))}
                    className="flex-1"
                  >
                    إضافة رصيد
                  </Button>
                  <Button
                    variant={balanceAction.type === 'deduct' ? 'default' : 'outline'}
                    onClick={() => setBalanceAction(prev => ({ ...prev, type: 'deduct' }))}
                    className="flex-1"
                  >
                    خصم رصيد
                  </Button>
                </div>

                {balanceAction.type && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">المبلغ (دج)</label>
                      <Input
                        type="number"
                        value={balanceAction.amount}
                        onChange={(e) => setBalanceAction(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="أدخل المبلغ"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">ملاحظة</label>
                      <Input
                        value={balanceAction.note}
                        onChange={(e) => setBalanceAction(prev => ({ ...prev, note: e.target.value }))}
                        placeholder="سبب التعديل..."
                      />
                    </div>
                    <Button
                      onClick={handleBalanceAction}
                      disabled={processing || !balanceAction.amount}
                      className="w-full"
                    >
                      {processing ? 'جاري التعديل...' : 
                       balanceAction.type === 'add' ? 'إضافة الرصيد' : 'خصم الرصيد'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'transactions' && (
          <UserTransactionsTab userId={user.user_id} />
        )}

        {activeTab === 'actions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>إجراءات الحساب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => handleAccountAction('activate')}
                  disabled={processing || user.is_account_activated}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  تفعيل الحساب
                </Button>
                <Button
                  onClick={() => handleAccountAction('suspend')}
                  disabled={processing}
                  variant="outline"
                  className="w-full"
                >
                  إيقاف مؤقت
                </Button>
                <Button
                  onClick={() => handleAccountAction('block')}
                  disabled={processing}
                  variant="destructive"
                  className="w-full"
                >
                  حظر الحساب
                </Button>
                
                <div className="pt-4 border-t">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        disabled={processing}
                        variant="destructive"
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4 ml-2" />
                        حذف الحساب نهائياً
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-right">
                          تأكيد حذف الحساب
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-right">
                          هل أنت متأكد من حذف هذا المستخدم نهائياً من النظام؟ 
                          <br />
                          <span className="text-red-600 font-semibold">
                            سيتم حذف المستخدم من قاعدة بيانات المصادقة وجميع البيانات المرتبطة به 
                            (الملف الشخصي، الرصيد، المعاملات، الطلبات، إلخ). 
                            هذا الإجراء نهائي ولا يمكن التراجع عنه أبداً!
                          </span>
                          <br /><br />
                          <span className="text-amber-600">
                            💡 نصيحة: إذا كنت تريد إيقاف المستخدم مؤقتاً، استخدم خيار "تعليق الحساب" بدلاً من الحذف.
                          </span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-row-reverse gap-2">
                        <AlertDialogCancel className="mt-0">إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            setProcessing(true);
                            try {
                              const { data: currentUser } = await supabase.auth.getUser();
                              if (!currentUser.user) throw new Error('غير مصرح');

                              // استخدام الـ function الجديدة للحذف النهائي من auth.users
                              const { data, error } = await supabase.rpc('admin_delete_user', {
                                _target_user_id: user.user_id,
                                _admin_id: currentUser.user.id
                              });

                              if (error) throw error;

                              const result = data as { success: boolean; message: string };
                              alert(result.message);
                              onUpdate();
                            } catch (error: any) {
                              console.error('Error deleting user:', error);
                              alert(`خطأ في حذف المستخدم: ${error.message}`);
                            } finally {
                              setProcessing(false);
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          تأكيد الحذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>تغيير الصلاحيات</CardTitle>
                <CardDescription>
                  الصلاحية الحالية: <Badge variant="outline">{user.user_roles?.[0]?.role === 'admin' ? 'مشرف' : 'مستخدم'}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground mb-4">
                  اختر الصلاحية الجديدة للمستخدم
                </div>
                <Button
                  onClick={() => handleRoleChange('user')}
                  disabled={processing || user.user_roles?.[0]?.role === 'user'}
                  variant="outline"
                  className="w-full"
                >
                  <User className="w-4 h-4 ml-2" />
                  تعيين كمستخدم عادي
                </Button>
                <Button
                  onClick={() => handleRoleChange('admin')}
                  disabled={processing || user.user_roles?.[0]?.role === 'admin'}
                  className="w-full bg-primary"
                >
                  <Shield className="w-4 h-4 ml-2" />
                  تعيين كمشرف
                </Button>
                
                <div className="pt-4 border-t text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">آخر نشاط:</span>
                    <span className="font-medium">{formatDate(user.updated_at || user.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">حالة التحقق:</span>
                    <span className="font-medium">
                      {user.is_identity_verified ? 'موثق' : 'غير موثق'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const pageSize = 20;

  // Fetch real user data with pagination
  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from('profiles')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        // Add search filters if searchTerm exists
        if (searchTerm) {
          // Search in full_name, email, or phone across all records
          query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
        } else {
          // Apply pagination only when not searching
          query = query.range(from, to);
        }

        const { data: profiles, error, count } = await query;
        
        if (error) throw error;
        setTotalCount(count || 0);

        // Fetch additional data for each user
        const usersWithStats = await Promise.all(
          (profiles || []).map(async (profile) => {
            // Fetch balance, roles, and transaction counts in parallel
            const [balanceRes, roleRes, depositsCount, withdrawalsCount, transfersCount] = await Promise.all([
              supabase.from('user_balances').select('balance').eq('user_id', profile.user_id).maybeSingle(),
              supabase.from('user_roles').select('role').eq('user_id', profile.user_id).maybeSingle(),
              supabase.from('deposits').select('id', { count: 'exact', head: true }).eq('user_id', profile.user_id),
              supabase.from('withdrawals').select('id', { count: 'exact', head: true }).eq('user_id', profile.user_id),
              supabase.from('transfers').select('id', { count: 'exact', head: true }).or(`sender_id.eq.${profile.user_id},recipient_id.eq.${profile.user_id}`)
            ]);

            return {
              ...profile,
              balance: Number(balanceRes.data?.balance) || 0,
              user_roles: roleRes.data ? [roleRes.data] : [],
              total_transactions: (depositsCount.count || 0) + (withdrawalsCount.count || 0) + (transfersCount.count || 0)
            };
          })
        );

        setUsers(usersWithStats);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [page, searchTerm]);

  const handleSyncUsersData = async () => {
    if (!confirm('هل تريد تحديث بيانات جميع المستخدمين القدامى؟ سيتم جلب البريد الإلكتروني ورقم الهاتف من بيانات التسجيل.')) {
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.rpc('sync_existing_users_data');
      
      if (error) throw error;

      const result = data as { success: boolean; updated_count: number; message: string };
      alert(result.message);
      
      // Refresh users list
      window.location.reload();
    } catch (error: any) {
      console.error('Error syncing users:', error);
      alert(`خطأ في تحديث البيانات: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // No need for client-side filtering since we're filtering in the database
  const filteredUsers = users;

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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1); // Reset to first page when searching
                }}
                className="pr-10"
              />
            </div>
            <Button 
              variant="outline"
              onClick={handleSyncUsersData}
              disabled={syncing}
            >
              {syncing ? 'جاري التحديث...' : 'تحديث بيانات المستخدمين القدامى'}
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
                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'م'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{user.full_name || 'غير محدد'}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email || 'غير محدد'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {user.phone || 'غير محدد'}
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
                        <span className="text-muted-foreground">الصلاحية: </span>
                        <span className="font-semibold text-foreground">
                          {user.user_roles?.[0]?.role || 'مستخدم'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(user)}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          عرض التفاصيل
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            تفاصيل المستخدم - {user.full_name}
                          </DialogTitle>
                          <DialogDescription>
                            إدارة شاملة لحساب المستخدم والتحكم في جميع الخيارات
                          </DialogDescription>
                        </DialogHeader>
                        
                        <UserDetailsModal user={user} onUpdate={() => window.location.reload()} />
                      </DialogContent>
                    </Dialog>
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

      {/* Pagination Controls */}
      {!searchTerm && totalCount > pageSize && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحة {page} من {Math.ceil(totalCount / pageSize)} ({totalCount} مستخدم)
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(totalCount / pageSize) || loading}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  );
}