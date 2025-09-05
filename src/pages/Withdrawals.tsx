import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useBalance } from '@/hooks/useBalance';
import { useWithdrawals } from '@/hooks/useWithdrawals';
import { useToast } from '@/hooks/use-toast';
import { ArrowUpRight, MapPin, Banknote, CreditCard, ArrowLeft, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import BackButton from '@/components/BackButton';

const Withdrawals = () => {
  const { balance } = useBalance();
  const { withdrawals, loading, createWithdrawal } = useWithdrawals();
  const { toast } = useToast();

  const [formData, setFormData] = React.useState({
    amount: '',
    withdrawal_method: '',
    account_number: '',
    account_holder_name: '',
    cash_location: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const withdrawalMethods = [
    { value: 'opay', label: 'OPay', icon: <CreditCard className="h-4 w-4" /> },
    { value: 'barid_bank', label: 'بريد الجزائر', icon: <Banknote className="h-4 w-4" /> },
    { value: 'ccp', label: 'البريد والمواصلات CCP', icon: <Banknote className="h-4 w-4" /> },
    { value: 'cash', label: 'سحب نقدي', icon: <MapPin className="h-4 w-4" /> }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200"><Clock className="h-3 w-3 mr-1" />قيد الانتظار</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-blue-600 border-blue-200"><CheckCircle className="h-3 w-3 mr-1" />معتمد</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />مكتمل</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-200"><X className="h-3 w-3 mr-1" />مرفوض</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('ar-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.withdrawal_method) {
      toast({
        title: "خطأ",
        description: "يرجى إكمال جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    
    // التحقق من الحد الأدنى والأقصى للسحب
    if (amount < 500) {
      toast({
        title: "خطأ",
        description: "الحد الأدنى للسحب هو 500 دج",
        variant: "destructive"
      });
      return;
    }

    if (amount > 200000) {
      toast({
        title: "خطأ",
        description: "الحد الأقصى للسحب هو 200,000 دج",
        variant: "destructive"
      });
      return;
    }

    // التحقق من الرصيد المتاح
    const totalAmount = amount + 50; // إضافة العمولة
    if ((balance?.balance || 0) < totalAmount) {
      toast({
        title: "رصيد غير كافي",
        description: `رصيدك الحالي ${formatCurrency(balance?.balance || 0)} غير كافي للسحب مع العمولة`,
        variant: "destructive"
      });
      return;
    }

    // التحقق من الحقول المطلوبة حسب طريقة السحب
    if (formData.withdrawal_method === 'cash' && !formData.cash_location) {
      toast({
        title: "خطأ",
        description: "يرجى تحديد موقع الاستلام للسحب النقدي",
        variant: "destructive"
      });
      return;
    }

    if (formData.withdrawal_method !== 'cash' && (!formData.account_number || !formData.account_holder_name)) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم الحساب واسم صاحب الحساب",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createWithdrawal({
        amount: totalAmount,
        withdrawal_method: formData.withdrawal_method,
        account_number: formData.account_number || undefined,
        account_holder_name: formData.account_holder_name || undefined,
        cash_location: formData.cash_location || undefined,
        notes: formData.notes || undefined
      });

      toast({
        title: "تم إرسال طلب السحب",
        description: "سيتم مراجعة طلبك ومعالجته خلال 24 ساعة",
      });

      // إعادة تعيين النموذج
      setFormData({
        amount: '',
        withdrawal_method: '',
        account_number: '',
        account_holder_name: '',
        cash_location: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating withdrawal:', error);
      toast({
        title: "خطأ",
        description: "فشل في إرسال طلب السحب. يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* نموذج طلب السحب */}
          <Card className="shadow-card border-0 bg-gradient-card backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-primary">
                  <ArrowUpRight className="h-5 w-5 text-white" />
                </div>
                طلب سحب جديد
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* عرض الرصيد المتاح */}
                <div className="bg-gradient-glass backdrop-blur-xl border border-white/10 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">الرصيد المتاح</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(balance?.balance || 0)}
                  </p>
                </div>

                {/* المبلغ */}
                <div className="space-y-2">
                  <Label htmlFor="amount">المبلغ المطلوب سحبه (دج) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="500"
                    max="200000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="ادخل المبلغ"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    الحد الأدنى: 500 دج • الحد الأقصى: 200,000 دج • العمولة: 50 دج
                  </p>
                  {formData.amount && (
                    <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      المبلغ مع العمولة: {formatCurrency(parseFloat(formData.amount) + 50)}
                    </div>
                  )}
                </div>

                {/* طريقة السحب */}
                <div className="space-y-2">
                  <Label htmlFor="withdrawal_method">طريقة السحب *</Label>
                  <Select value={formData.withdrawal_method} onValueChange={(value) => setFormData({ ...formData, withdrawal_method: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر طريقة السحب" />
                    </SelectTrigger>
                    <SelectContent>
                      {withdrawalMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          <div className="flex items-center gap-2">
                            {method.icon}
                            {method.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* حقول إضافية حسب طريقة السحب */}
                {formData.withdrawal_method === 'cash' ? (
                  <div className="space-y-2">
                    <Label htmlFor="cash_location">موقع الاستلام *</Label>
                    <Input
                      id="cash_location"
                      value={formData.cash_location}
                      onChange={(e) => setFormData({ ...formData, cash_location: e.target.value })}
                      placeholder="ادخل الموقع المفضل للاستلام"
                      required
                    />
                  </div>
                ) : formData.withdrawal_method && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="account_number">رقم الحساب *</Label>
                      <Input
                        id="account_number"
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        placeholder="ادخل رقم الحساب"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="account_holder_name">اسم صاحب الحساب *</Label>
                      <Input
                        id="account_holder_name"
                        value={formData.account_holder_name}
                        onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                        placeholder="ادخل اسم صاحب الحساب"
                        required
                      />
                    </div>
                  </>
                )}

                {/* ملاحظات */}
                <div className="space-y-2">
                  <Label htmlFor="notes">ملاحظات إضافية</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="أي ملاحظات إضافية..."
                    rows={3}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "جاري الإرسال..." : "إرسال طلب السحب"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* قائمة طلبات السحب */}
          <Card className="shadow-card border-0 bg-gradient-card backdrop-blur-sm">
            <CardHeader>
              <CardTitle>طلبات السحب السابقة</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-muted/50 rounded animate-pulse" />
                  ))}
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لا توجد طلبات سحب سابقة</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {withdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-lg">
                            {formatCurrency(withdrawal.amount)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {withdrawalMethods.find(m => m.value === withdrawal.withdrawal_method)?.label}
                          </p>
                        </div>
                        {getStatusBadge(withdrawal.status)}
                      </div>
                      
                      {withdrawal.withdrawal_method === 'cash' ? (
                        <p className="text-sm">
                          <strong>موقع الاستلام:</strong> {withdrawal.cash_location}
                        </p>
                      ) : (
                        <div className="text-sm space-y-1">
                          <p><strong>رقم الحساب:</strong> {withdrawal.account_number}</p>
                          <p><strong>اسم الحساب:</strong> {withdrawal.account_holder_name}</p>
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        {formatDate(withdrawal.created_at)}
                      </p>
                      
                      {withdrawal.admin_notes && (
                        <div className="bg-muted/50 p-2 rounded text-sm">
                          <strong>ملاحظة الإدارة:</strong> {withdrawal.admin_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Withdrawals;