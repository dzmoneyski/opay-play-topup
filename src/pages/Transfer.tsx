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
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden" dir="rtl">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-primary rounded-full opacity-10 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-secondary rounded-full opacity-10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container mx-auto px-4 py-6 lg:py-12 max-w-7xl relative z-10">
        <div className="mb-8">
          <BackButton />
        </div>
        
        {/* Ultra Premium Header */}
        <div className="text-center mb-12 animate-slide-up">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-primary rounded-[2.5rem] blur-2xl opacity-60 animate-pulse"></div>
            <div className="relative p-6 rounded-[2.5rem] bg-gradient-primary shadow-glow">
              <Send className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
            تحويل الأموال
          </h1>
          <p className="text-white/90 text-xl max-w-2xl mx-auto leading-relaxed">
            أرسل الأموال إلى الأصدقاء والعائلة بسهولة وأمان فائق
          </p>
        </div>

        {/* Ultra Premium Balance Card */}
        <div className="mb-12 animate-slide-up relative" style={{ animationDelay: '0.1s' }}>
          <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-2xl opacity-20"></div>
          <Card className="relative bg-gradient-glass backdrop-blur-2xl border-0 shadow-elevated overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <CardContent className="p-8 lg:p-10 relative z-10">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="flex-1 text-center lg:text-right">
                  <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
                    <div className="relative">
                      <div className="w-3 h-3 rounded-full bg-green-400 animate-ping absolute"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <p className="text-white/80 text-base font-semibold tracking-wide">الرصيد المتاح</p>
                  </div>
                  <div className="flex items-baseline justify-center lg:justify-start gap-4">
                    <span className="text-5xl lg:text-6xl font-bold text-white tracking-tight">
                      {showBalance ? `${(balance?.balance ?? 0).toFixed(2)}` : "••••••"}
                    </span>
                    <span className="text-2xl text-white/90 font-bold">دج</span>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-white/80 hover:text-white hover:bg-white/15 rounded-2xl h-14 w-14 transition-all hover:scale-110 backdrop-blur-sm border border-white/10"
                  >
                    {showBalance ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-secondary rounded-3xl blur-lg opacity-50"></div>
                    <div className="relative p-5 rounded-3xl bg-gradient-secondary shadow-lg">
                      <Wallet className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Ultra Premium Transfer Form */}
          <div className="lg:col-span-2">
            <Card className="bg-card/95 backdrop-blur-xl border border-border/30 shadow-elevated animate-slide-up overflow-hidden" style={{ animationDelay: '0.2s' }}>
              {/* Premium Header Section */}
              <div className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-b border-border/30 p-8">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-md opacity-50"></div>
                    <div className="relative p-4 rounded-3xl bg-gradient-primary shadow-lg">
                      <Send className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">بيانات التحويل</h2>
                    <p className="text-muted-foreground">املأ البيانات بدقة لإتمام العملية</p>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-8 lg:p-10">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Ultra Premium Recipient Input */}
                  <div className="space-y-4">
                    <Label htmlFor="recipient" className="text-foreground font-bold text-lg flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      رقم هاتف المستلم
                    </Label>
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-primary rounded-2xl opacity-0 group-focus-within:opacity-20 blur transition-opacity"></div>
                      <Input
                        id="recipient"
                        type="tel"
                        placeholder="مثال: +213555123456"
                        value={transferData.recipient}
                        onChange={(e) => setTransferData(prev => ({ ...prev, recipient: e.target.value }))}
                        className="relative bg-background/80 backdrop-blur-sm border-2 border-border/50 hover:border-primary/50 focus:border-primary focus:shadow-lg transition-all h-16 text-lg rounded-2xl font-medium"
                        required
                      />
                    </div>
                  </div>

                  {/* Ultra Premium Amount Input */}
                  <div className="space-y-4">
                    <Label htmlFor="amount" className="text-foreground font-bold text-lg flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      المبلغ (دج)
                    </Label>
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-primary rounded-2xl opacity-0 group-focus-within:opacity-20 blur transition-opacity"></div>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={transferData.amount}
                        onChange={(e) => setTransferData(prev => ({ ...prev, amount: e.target.value }))}
                        className="relative bg-background/80 backdrop-blur-sm border-2 border-border/50 hover:border-primary/50 focus:border-primary focus:shadow-lg transition-all h-16 text-lg rounded-2xl font-medium"
                        min="1"
                        step="0.01"
                        required
                      />
                    </div>
                    
                    {/* Premium Quick Amount Buttons */}
                    <div className="flex flex-wrap gap-3 pt-2">
                      {quickAmounts.map((quickAmount) => (
                        <Button
                          key={quickAmount}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => selectQuickAmount(quickAmount)}
                          className="hover:bg-gradient-primary hover:text-white hover:border-primary/50 transition-all hover:scale-105 hover:shadow-lg rounded-2xl px-8 py-3 font-bold border-2 text-base"
                        >
                          {quickAmount} دج
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Ultra Premium Fee Preview */}
                  {amount > 0 && (
                    <div className="relative p-8 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 rounded-3xl border-2 border-primary/10 shadow-lg">
                      <div className="absolute inset-0 bg-grid-white/5 rounded-3xl"></div>
                      <div className="relative">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-md opacity-50"></div>
                            <div className="relative p-3 rounded-2xl bg-gradient-primary shadow-lg">
                              <CheckCircle className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <h3 className="font-bold text-foreground text-xl">ملخص التحويل</h3>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-4 bg-background/50 rounded-2xl backdrop-blur-sm">
                            <span className="text-muted-foreground font-semibold text-base">المبلغ المرسل:</span>
                            <span className="font-bold text-foreground text-xl">{formatCurrency(amount)} دج</span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-background/50 rounded-2xl backdrop-blur-sm">
                            <span className="text-muted-foreground font-semibold text-base">رسوم التحويل:</span>
                            <span className="font-bold text-foreground text-xl">{formatCurrency(transferFee.fee_amount)} دج</span>
                          </div>
                          <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent my-2"></div>
                          <div className="relative">
                            <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-sm"></div>
                            <div className="relative flex justify-between items-center p-5 bg-primary/10 rounded-2xl border border-primary/20">
                              <span className="font-bold text-foreground text-lg">إجمالي المخصوم:</span>
                              <span className="font-bold text-primary text-2xl">{formatCurrency(totalDeducted)} دج</span>
                            </div>
                          </div>
                          <div className="relative">
                            <div className="absolute inset-0 bg-green-500/5 rounded-2xl blur-sm"></div>
                            <div className="relative flex justify-between items-center p-5 bg-green-500/10 rounded-2xl border border-green-500/20">
                              <span className="font-semibold text-muted-foreground text-base">المستلم سيحصل على:</span>
                              <span className="font-bold text-green-600 text-2xl">{formatCurrency(amount)} دج</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Premium Note Input */}
                  <div className="space-y-4">
                    <Label htmlFor="note" className="text-foreground font-bold text-lg">
                      ملاحظة (اختيارية)
                    </Label>
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-primary rounded-2xl opacity-0 group-focus-within:opacity-20 blur transition-opacity"></div>
                      <Input
                        id="note"
                        type="text"
                        placeholder="أضف ملاحظة للمستلم"
                        value={transferData.note}
                        onChange={(e) => setTransferData(prev => ({ ...prev, note: e.target.value }))}
                        className="relative bg-background/80 backdrop-blur-sm border-2 border-border/50 hover:border-primary/50 focus:border-primary focus:shadow-lg transition-all h-16 text-lg rounded-2xl font-medium"
                      />
                    </div>
                  </div>

                  {/* Ultra Premium Submit Button */}
                  <div className="relative pt-4">
                    <div className="absolute -inset-1 bg-gradient-primary rounded-3xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                    <Button 
                      type="submit" 
                      className="relative w-full bg-gradient-primary hover:opacity-90 text-white font-bold py-7 text-xl transition-all hover:scale-[1.02] hover:shadow-elevated rounded-3xl overflow-hidden group"
                      disabled={transferLoading}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                      {transferLoading ? (
                        <>
                          <Clock className="h-7 w-7 animate-spin ml-2 relative z-10" />
                          <span className="relative z-10">جاري التحويل...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-7 w-7 ml-2 relative z-10" />
                          <span className="relative z-10">تحويل الأموال</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Ultra Premium Sidebar */}
          <div className="space-y-8">
            {/* Ultra Premium Recent Contacts */}
            <Card className="bg-card/95 backdrop-blur-xl border border-border/30 shadow-elevated animate-slide-up overflow-hidden" style={{ animationDelay: '0.3s' }}>
              <div className="relative bg-gradient-to-br from-secondary/10 via-accent/5 to-transparent border-b border-border/30 p-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-secondary rounded-3xl blur-md opacity-50"></div>
                    <div className="relative p-3 rounded-3xl bg-gradient-secondary shadow-lg">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">جهات الاتصال</h3>
                    <p className="text-sm text-muted-foreground">اختر من القائمة</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6 space-y-4">
                {contacts.length > 0 ? (
                  contacts.map((contact, index) => (
                    <div 
                      key={index}
                      className="relative group cursor-pointer"
                      onClick={() => selectContact(contact)}
                    >
                      <div className="absolute -inset-0.5 bg-gradient-primary rounded-3xl opacity-0 group-hover:opacity-20 blur transition-opacity"></div>
                      <div className="relative flex items-center gap-4 p-5 rounded-3xl bg-muted/20 hover:bg-muted/40 border border-transparent hover:border-primary/20 transition-all group-hover:scale-[1.02] backdrop-blur-sm">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-md opacity-0 group-hover:opacity-50 transition-opacity"></div>
                          <div className="relative w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:scale-110 transition-transform">
                            {contact.avatar}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors text-base">
                            {contact.name}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">{contact.phone}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-[-4px] transition-all" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16">
                    <div className="relative inline-block mb-4">
                      <div className="absolute inset-0 bg-muted/30 rounded-full blur-md"></div>
                      <div className="relative w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center">
                        <Users className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                    </div>
                    <p className="text-muted-foreground font-medium">لا توجد جهات اتصال متاحة</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ultra Premium Security Info */}
            <Card className="relative bg-gradient-to-br from-accent/15 to-accent/5 backdrop-blur-xl border-2 border-accent/30 shadow-elevated animate-slide-up overflow-hidden" style={{ animationDelay: '0.4s' }}>
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
              <CardContent className="p-8 relative z-10">
                <div className="flex items-start gap-5">
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-gold rounded-3xl blur-md opacity-50"></div>
                    <div className="relative p-4 rounded-3xl bg-gradient-gold shadow-lg">
                      <CheckCircle className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground mb-4 text-xl">تحويل آمن ومضمون</h3>
                    <ul className="space-y-3">
                      {[
                        'تشفير عالي المستوى',
                        'تأكيد فوري للتحويل',
                        'رسوم منافسة وشفافة',
                        'متاح 24/7'
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-muted-foreground group">
                          <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 group-hover:scale-125 transition-transform"></div>
                          <span className="text-base font-medium">{item}</span>
                        </li>
                      ))}
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