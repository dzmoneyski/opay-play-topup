import { useState } from 'react';
import { Smartphone, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BackButton from '@/components/BackButton';
import { usePhoneOperators } from '@/hooks/usePhoneOperators';
import { usePhoneTopupOrders } from '@/hooks/usePhoneTopupOrders';
import { useBalance } from '@/hooks/useBalance';

// Import operator logos
import mobilisLogo from '@/assets/mobilis-logo.png';
import djezzyLogo from '@/assets/djezzy-logo.png';
import ooredooLogo from '@/assets/ooredoo-logo.png';
import idoomLogo from '@/assets/idoom-logo.webp';

// Operator logos mapping
const operatorLogos: Record<string, string> = {
  'mobilis': mobilisLogo,
  'djezzy': djezzyLogo,
  'ooredoo': ooredooLogo,
  'idoom-adsl': idoomLogo
};

const PhoneTopup = () => {
  const { operators, loading: operatorsLoading } = usePhoneOperators();
  const { orders, loading: ordersLoading, createOrder } = usePhoneTopupOrders();
  const { balance } = useBalance();
  
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedOp = operators.find(op => op.id === selectedOperator);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOperator || !phoneNumber || !amount) return;
    
    setSubmitting(true);
    const success = await createOrder(selectedOperator, phoneNumber, parseFloat(amount), notes);
    if (success) {
      setPhoneNumber('');
      setAmount('');
      setNotes('');
      setSelectedOperator(null);
    }
    setSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />قيد الانتظار</Badge>;
      case 'approved':
        return <Badge className="gap-1 bg-green-500"><CheckCircle className="w-3 h-3" />تم الشحن</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />مرفوض</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (operatorsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <BackButton />
        
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <Smartphone className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">شحن الهاتف</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">شحن رصيد الهاتف</h1>
          <p className="text-muted-foreground">اشحن هاتفك أو خط الإنترنت</p>
        </div>

        {/* Balance Card */}
        <Card className="mb-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">رصيدك الحالي</span>
              <span className="text-2xl font-bold text-primary">{balance?.balance?.toLocaleString() || 0} د.ج</span>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="topup" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="topup">شحن جديد</TabsTrigger>
            <TabsTrigger value="history">سجل الطلبات</TabsTrigger>
          </TabsList>

          <TabsContent value="topup" className="space-y-6">
            {/* Operators Grid */}
            <div className="grid grid-cols-2 gap-3">
              {operators.map((operator) => (
                <Card 
                  key={operator.id}
                  className={`cursor-pointer transition-all hover:scale-[1.02] ${
                    selectedOperator === operator.id 
                      ? 'ring-2 ring-primary border-primary' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedOperator(operator.id)}
                >
                  <CardContent className="p-4 text-center">
                    {operatorLogos[operator.slug] ? (
                      <img 
                        src={operatorLogos[operator.slug]} 
                        alt={operator.name_ar}
                        className="w-12 h-12 mx-auto mb-2 rounded-xl object-contain"
                      />
                    ) : (
                      <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-muted flex items-center justify-center">
                        <Smartphone className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <h3 className="font-semibold">{operator.name_ar}</h3>
                    <p className="text-xs text-muted-foreground">
                      {operator.min_amount} - {operator.max_amount.toLocaleString()} د.ج
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Form */}
            {selectedOperator && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">تفاصيل الشحن</CardTitle>
                  <CardDescription>أدخل رقم الهاتف والمبلغ</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">رقم الهاتف</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="0xxxxxxxxx"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="text-left"
                        dir="ltr"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">المبلغ (د.ج)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder={`${selectedOp?.min_amount} - ${selectedOp?.max_amount}`}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min={selectedOp?.min_amount}
                        max={selectedOp?.max_amount}
                        required
                      />
                      {selectedOp && (
                        <p className="text-xs text-muted-foreground">
                          الحد: {selectedOp.min_amount} - {selectedOp.max_amount.toLocaleString()} د.ج
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                      <Input
                        id="notes"
                        placeholder="أي تفاصيل إضافية..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={submitting || !phoneNumber || !amount}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                          جاري الإرسال...
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-4 h-4 ml-2" />
                          شحن {amount ? `${parseFloat(amount).toLocaleString()} د.ج` : ''}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history">
            {ordersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Smartphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لا توجد طلبات سابقة</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                        {operatorLogos[order.phone_operators?.slug || ''] ? (
                          <img 
                            src={operatorLogos[order.phone_operators?.slug || '']} 
                            alt={order.phone_operators?.name_ar}
                            className="w-8 h-8 rounded-lg object-contain"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <Smartphone className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                          <div>
                            <p className="font-medium">{order.phone_operators?.name_ar}</p>
                            <p className="text-sm text-muted-foreground" dir="ltr">{order.phone_number}</p>
                          </div>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('ar-DZ')}
                        </span>
                        <span className="font-bold text-primary">{order.amount.toLocaleString()} د.ج</span>
                      </div>
                      {order.admin_notes && order.status === 'rejected' && (
                        <p className="text-sm text-destructive mt-2 bg-destructive/10 p-2 rounded">
                          {order.admin_notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PhoneTopup;
