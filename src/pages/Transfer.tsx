import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useBalance } from '@/hooks/useBalance';
import { useTransfers } from '@/hooks/useTransfers';
import { useContacts } from '@/hooks/useContacts';
import { useToast } from '@/hooks/use-toast';
import { useFeeSettings } from '@/hooks/useFeeSettings';
import { calculateFee, formatCurrency } from '@/lib/feeCalculator';
import BackButton from '@/components/BackButton';
import { 
  Send, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Phone,
  Eye,
  EyeOff,
  Wallet
} from 'lucide-react';

const Transfer = () => {
  const { user } = useAuth();
  const { balance, fetchBalance } = useBalance();
  const { processTransfer, isLoading: transferLoading } = useTransfers();
  const { contacts } = useContacts();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { feeSettings } = useFeeSettings();
  
  const [transferData, setTransferData] = useState({
    recipient: '',
    amount: '',
    note: ''
  });
  const [showBalance, setShowBalance] = useState(true);

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  const amount = parseFloat(transferData.amount) || 0;
  const transferFee = calculateFee(amount, feeSettings?.transfer_fees || null);
  const totalDeducted = amount + transferFee.fee_amount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transferData.recipient || !transferData.amount) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    if (totalDeducted > (balance?.balance || 0)) {
      toast({
        title: "رصيد غير كافي",
        description: `رصيدك الحالي ${formatCurrency(balance?.balance || 0)} دج غير كافي للتحويل مع الرسوم`,
        variant: "destructive"
      });
      return;
    }

    const result = await processTransfer({
      recipient_phone: transferData.recipient,
      amount: parseFloat(transferData.amount),
      note: transferData.note
    });
    
    if (result.success) {
      // Refresh balance after successful transfer
      await fetchBalance();
      
      // Reset form
      setTransferData({ recipient: '', amount: '', note: '' });
      
      // Navigate back to home
      navigate('/');
    }
  };

  const selectQuickAmount = (amount: number) => {
    setTransferData(prev => ({ ...prev, amount: amount.toString() }));
  };

  const selectContact = (contact: { name: string; phone: string; avatar: string }) => {
    setTransferData(prev => ({ ...prev, recipient: contact.phone }));
  };

  if (!user) {
    React.useEffect(() => {
      navigate('/auth');
    }, [navigate]);
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-hero" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <BackButton />
        
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex p-4 rounded-3xl bg-gradient-primary mb-4 shadow-glow">
            <Send className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">تحويل الأموال</h1>
          <p className="text-white/70">أرسل الأموال إلى الأصدقاء والعائلة بسهولة وأمان</p>
        </div>

        {/* Balance Card */}
        <Card className="mb-8 bg-gradient-glass backdrop-blur-xl border border-white/10 shadow-elevated animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm mb-1">الرصيد المتاح</p>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-white">
                    {showBalance ? `${(balance?.balance ?? 0).toFixed(2)}` : "••••••"}
                  </span>
                  <span className="text-lg text-white/80">دج</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
                <div className="p-3 rounded-2xl bg-gradient-secondary">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Transfer Form */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-card backdrop-blur-sm border-0 shadow-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-foreground">
                  <div className="p-2 rounded-xl bg-gradient-primary">
                    <Send className="h-5 w-5 text-white" />
                  </div>
                  بيانات التحويل
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Recipient */}
                  <div className="space-y-2">
                    <Label htmlFor="recipient" className="text-foreground font-medium">
                      رقم هاتف المستلم
                    </Label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="recipient"
                        type="tel"
                        placeholder="مثال: +213555123456"
                        value={transferData.recipient}
                        onChange={(e) => setTransferData(prev => ({ ...prev, recipient: e.target.value }))}
                        className="pr-12 bg-background/50 border-border focus:border-primary transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-foreground font-medium">
                      المبلغ (دج)
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="أدخل المبلغ"
                      value={transferData.amount}
                      onChange={(e) => setTransferData(prev => ({ ...prev, amount: e.target.value }))}
                      className="bg-background/50 border-border focus:border-primary transition-colors"
                      min="1"
                      step="0.01"
                      required
                    />
                    
                    {/* Quick Amount Buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {quickAmounts.map((amount) => (
                        <Button
                          key={amount}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => selectQuickAmount(amount)}
                          className="hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          {amount} دج
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Fee Preview */}
                  {amount > 0 && (
                    <div className="p-4 bg-gradient-secondary/10 rounded-xl border border-accent/20">
                      <h3 className="font-semibold text-foreground mb-3">ملخص التحويل</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المبلغ المرسل:</span>
                          <span className="font-medium text-foreground">{formatCurrency(amount)} دج</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">رسوم التحويل:</span>
                          <span className="font-medium text-foreground">{formatCurrency(transferFee.fee_amount)} دج</span>
                        </div>
                        <div className="h-px bg-border my-2"></div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-foreground">إجمالي المخصوم من رصيدك:</span>
                          <span className="text-primary">{formatCurrency(totalDeducted)} دج</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المستلم سيحصل على:</span>
                          <span className="font-medium text-green-600">{formatCurrency(amount)} دج</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Note */}
                  <div className="space-y-2">
                    <Label htmlFor="note" className="text-foreground font-medium">
                      ملاحظة (اختيارية)
                    </Label>
                    <Input
                      id="note"
                      type="text"
                      placeholder="أضف ملاحظة للمستلم"
                      value={transferData.note}
                      onChange={(e) => setTransferData(prev => ({ ...prev, note: e.target.value }))}
                      className="bg-background/50 border-border focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:opacity-90 text-white font-medium py-3 transition-all hover:scale-105"
                    disabled={transferLoading}
                  >
                    {transferLoading ? (
                      <>
                        <Clock className="h-5 w-5 animate-spin ml-2" />
                        جاري التحويل...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 ml-2" />
                        تحويل الأموال
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Contacts */}
            <Card className="bg-gradient-card backdrop-blur-sm border-0 shadow-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-foreground">
                  <div className="p-2 rounded-xl bg-gradient-secondary">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  جهات الاتصال الأخيرة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contacts.length > 0 ? (
                  contacts.map((contact, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-primary/5 transition-colors cursor-pointer group"
                      onClick={() => selectContact(contact)}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                        {contact.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {contact.name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{contact.phone}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لا توجد جهات اتصال متاحة
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Security Info */}
            <Card className="bg-gradient-gold/10 backdrop-blur-sm border border-accent/20 shadow-card animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-gradient-gold">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-2">تحويل آمن ومضمون</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• تشفير عالي المستوى</li>
                      <li>• تأكيد فوري للتحويل</li>
                      <li>• رسوم منافسة وشفافة</li>
                      <li>• متاح 24/7</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transfer;