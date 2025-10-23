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
      <div className="container mx-auto px-4 py-6 lg:py-10 max-w-7xl">
        <div className="mb-6">
          <BackButton />
        </div>
        
        {/* Professional Header with Better Typography */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="inline-flex p-5 rounded-[2rem] bg-gradient-primary mb-5 shadow-glow relative">
            <div className="absolute inset-0 bg-white/20 rounded-[2rem] blur-xl"></div>
            <Send className="h-10 w-10 text-white relative z-10" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight">تحويل الأموال</h1>
          <p className="text-white/80 text-lg max-w-md mx-auto">أرسل الأموال إلى الأصدقاء والعائلة بسهولة وأمان</p>
        </div>

        {/* Enhanced Balance Card with Premium Design */}
        <Card className="mb-10 bg-gradient-glass backdrop-blur-xl border-0 shadow-elevated animate-slide-up overflow-hidden relative" style={{ animationDelay: '0.1s' }}>
          <div className="absolute inset-0 bg-gradient-primary opacity-5"></div>
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <p className="text-white/70 text-sm font-medium">الرصيد المتاح</p>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
                    {showBalance ? `${(balance?.balance ?? 0).toFixed(2)}` : "••••••"}
                  </span>
                  <span className="text-xl text-white/80 font-medium">دج</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-white/70 hover:text-white hover:bg-white/10 rounded-2xl h-12 w-12 transition-all hover:scale-110"
                >
                  {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
                <div className="p-4 rounded-2xl bg-gradient-secondary shadow-lg">
                  <Wallet className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Enhanced Transfer Form with Professional Design */}
          <div className="lg:col-span-2">
            <Card className="bg-card backdrop-blur-sm border border-border/50 shadow-card animate-slide-up overflow-hidden" style={{ animationDelay: '0.2s' }}>
              <div className="bg-gradient-primary/5 border-b border-border/50 p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-primary shadow-lg">
                    <Send className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">بيانات التحويل</h2>
                    <p className="text-sm text-muted-foreground">أدخل معلومات المستلم والمبلغ</p>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Professional Recipient Input */}
                  <div className="space-y-3">
                    <Label htmlFor="recipient" className="text-foreground font-semibold text-base flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      رقم هاتف المستلم
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-primary/5 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                      <Input
                        id="recipient"
                        type="tel"
                        placeholder="مثال: +213555123456"
                        value={transferData.recipient}
                        onChange={(e) => setTransferData(prev => ({ ...prev, recipient: e.target.value }))}
                        className="relative bg-background border-2 border-border hover:border-primary/50 focus:border-primary transition-all h-14 text-base rounded-xl shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* Professional Amount Input */}
                  <div className="space-y-3">
                    <Label htmlFor="amount" className="text-foreground font-semibold text-base flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      المبلغ (دج)
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-primary/5 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={transferData.amount}
                        onChange={(e) => setTransferData(prev => ({ ...prev, amount: e.target.value }))}
                        className="relative bg-background border-2 border-border hover:border-primary/50 focus:border-primary transition-all h-14 text-base rounded-xl shadow-sm"
                        min="1"
                        step="0.01"
                        required
                      />
                    </div>
                    
                    {/* Enhanced Quick Amount Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {quickAmounts.map((amount) => (
                        <Button
                          key={amount}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => selectQuickAmount(amount)}
                          className="hover:bg-gradient-primary hover:text-white hover:border-primary transition-all hover:scale-105 rounded-xl px-6 py-2.5 font-medium border-2"
                        >
                          {amount} دج
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Premium Fee Preview Card */}
                  {amount > 0 && (
                    <div className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border-2 border-primary/10 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-xl bg-gradient-primary">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-bold text-foreground text-lg">ملخص التحويل</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2">
                          <span className="text-muted-foreground font-medium">المبلغ المرسل:</span>
                          <span className="font-bold text-foreground text-lg">{formatCurrency(amount)} دج</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-muted-foreground font-medium">رسوم التحويل:</span>
                          <span className="font-bold text-foreground text-lg">{formatCurrency(transferFee.fee_amount)} دج</span>
                        </div>
                        <div className="h-px bg-gradient-primary/20 my-2"></div>
                        <div className="flex justify-between items-center py-2 px-4 bg-primary/10 rounded-xl">
                          <span className="font-bold text-foreground">إجمالي المخصوم:</span>
                          <span className="font-bold text-primary text-xl">{formatCurrency(totalDeducted)} دج</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-4 bg-green-500/10 rounded-xl">
                          <span className="font-medium text-muted-foreground">المستلم سيحصل على:</span>
                          <span className="font-bold text-green-600 text-xl">{formatCurrency(amount)} دج</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Professional Note Input */}
                  <div className="space-y-3">
                    <Label htmlFor="note" className="text-foreground font-semibold text-base">
                      ملاحظة (اختيارية)
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-primary/5 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                      <Input
                        id="note"
                        type="text"
                        placeholder="أضف ملاحظة للمستلم"
                        value={transferData.note}
                        onChange={(e) => setTransferData(prev => ({ ...prev, note: e.target.value }))}
                        className="relative bg-background border-2 border-border hover:border-primary/50 focus:border-primary transition-all h-14 text-base rounded-xl shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Premium Submit Button */}
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:opacity-90 text-white font-bold py-6 text-lg transition-all hover:scale-[1.02] hover:shadow-elevated rounded-2xl relative overflow-hidden group"
                    disabled={transferLoading}
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                    {transferLoading ? (
                      <>
                        <Clock className="h-6 w-6 animate-spin ml-2 relative z-10" />
                        <span className="relative z-10">جاري التحويل...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-6 w-6 ml-2 relative z-10" />
                        <span className="relative z-10">تحويل الأموال</span>
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Premium Recent Contacts Card */}
            <Card className="bg-card backdrop-blur-sm border border-border/50 shadow-card animate-slide-up overflow-hidden" style={{ animationDelay: '0.3s' }}>
              <div className="bg-gradient-secondary/5 border-b border-border/50 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-secondary shadow-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">جهات الاتصال</h3>
                    <p className="text-sm text-muted-foreground">اختر من القائمة</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6 space-y-3">
                {contacts.length > 0 ? (
                  contacts.map((contact, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 hover:bg-primary/10 border-2 border-transparent hover:border-primary/20 transition-all cursor-pointer group hover:scale-[1.02] hover:shadow-sm"
                      onClick={() => selectContact(contact)}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-110 transition-transform">
                        {contact.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors text-base">
                          {contact.name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{contact.phone}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">لا توجد جهات اتصال متاحة</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Premium Security Info Card */}
            <Card className="bg-gradient-to-br from-accent/10 to-accent/5 backdrop-blur-sm border-2 border-accent/20 shadow-card animate-slide-up overflow-hidden" style={{ animationDelay: '0.4s' }}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-gold shadow-lg flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground mb-3 text-lg">تحويل آمن ومضمون</h3>
                    <ul className="space-y-2.5">
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0"></div>
                        <span>تشفير عالي المستوى</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0"></div>
                        <span>تأكيد فوري للتحويل</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0"></div>
                        <span>رسوم منافسة وشفافة</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0"></div>
                        <span>متاح 24/7</span>
                      </li>
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