import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import BackButton from '@/components/BackButton';
import { useDigitalCards } from '@/hooks/useDigitalCards';
import { useBalance } from '@/hooks/useBalance';
import { useAuth } from '@/hooks/useAuth';
import {
  ShoppingBag,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  EyeOff,
  Package,
  ShoppingCart,
  DollarSign,
  Info
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Shop = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance } = useBalance();
  const { cardTypes, feeSettings, orders, loading, purchasing, purchaseCard } = useDigitalCards();
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [accountId, setAccountId] = useState('');
  const [amountUsd, setAmountUsd] = useState<string>('');
  const [showBalance, setShowBalance] = useState(true);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const calculateTotal = (amount: number, exchangeRate: number) => {
    const amountDzd = amount * exchangeRate;
    let feeAmount = 0;
    
    if (feeSettings) {
      if (feeSettings.fee_type === 'percentage') {
        feeAmount = (amountDzd * feeSettings.fee_value) / 100;
      } else {
        feeAmount = feeSettings.fee_value;
      }
      
      if (feeSettings.min_fee) {
        feeAmount = Math.max(feeAmount, feeSettings.min_fee);
      }
      if (feeSettings.max_fee) {
        feeAmount = Math.min(feeAmount, feeSettings.max_fee);
      }
    }
    
    return {
      amountDzd,
      feeAmount,
      totalDzd: amountDzd + feeAmount
    };
  };

  const handleCardClick = (cardType: any) => {
    setSelectedCard(cardType);
    setAccountId('');
    setAmountUsd('');
  };

  const handleConfirmPurchase = async () => {
    if (!selectedCard || !accountId || !amountUsd) return;

    const amount = parseFloat(amountUsd);
    const result = await purchaseCard(selectedCard.id, accountId, amount);
    
    if (result.success) {
      setSelectedCard(null);
      setAccountId('');
      setAmountUsd('');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 ml-1" />مكتمل</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 ml-1" />قيد المعالجة</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Clock className="h-3 w-3 ml-1" />جاري المعالجة</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 ml-1" />فشل</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getProviderGradient = (provider: string) => {
    const gradients: { [key: string]: string } = {
      redotpay: 'from-red-500 via-red-600 to-red-700',
      payeer: 'from-blue-500 via-blue-600 to-blue-700',
      webmoney: 'from-purple-500 via-purple-600 to-purple-700',
      perfectmoney: 'from-yellow-500 via-yellow-600 to-yellow-700',
      skrill: 'from-violet-500 via-violet-600 to-violet-700',
    };
    return gradients[provider] || 'from-primary via-primary to-primary';
  };

  const amount = parseFloat(amountUsd) || 0;
  const totals = selectedCard && amount > 0 ? calculateTotal(amount, selectedCard.exchange_rate) : null;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glass"></div>
        <div className="container mx-auto px-4 py-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <BackButton />
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShoppingBag className="h-6 w-6" />
              متجر البطاقات الإلكترونية
            </h1>
            <div className="w-10" />
          </div>

          {/* Balance Card */}
          <Card className="bg-gradient-glass backdrop-blur-xl border border-white/10 shadow-elevated">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm mb-1">رصيدك المتاح</p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-white">
                      {showBalance ? `${(balance?.balance ?? 0).toFixed(2)}` : "••••••"}
                    </span>
                    <span className="text-lg text-white/80">دج</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="shop" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="shop" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              المتجر
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <Package className="h-4 w-4" />
              طلباتي ({orders.length})
            </TabsTrigger>
          </TabsList>

          {/* Shop Tab */}
          <TabsContent value="shop" className="space-y-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse h-64">
                    <div className="h-full bg-muted/20" />
                  </Card>
                ))}
              </div>
            ) : cardTypes.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">لا توجد بطاقات متاحة حالياً</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cardTypes.map((cardType) => (
                  <Card 
                    key={cardType.id} 
                    className="group cursor-pointer border-0 shadow-card hover:shadow-elevated transition-all duration-300 hover:scale-105 overflow-hidden"
                    onClick={() => handleCardClick(cardType)}
                  >
                    {/* Card Visual - Plastic Card Design */}
                    <div className={`relative h-48 bg-gradient-to-br ${getProviderGradient(cardType.provider)} p-6 flex flex-col justify-between`}>
                      {/* Card Chip Effect */}
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-10 bg-yellow-400/30 rounded-md border-2 border-yellow-300/50 backdrop-blur-sm"></div>
                        <CreditCard className="h-8 w-8 text-white/80" />
                      </div>
                      
                      {/* Card Logo */}
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-1">{cardType.name}</h3>
                        <p className="text-white/80 text-sm">{cardType.name_ar}</p>
                      </div>
                      
                      {/* Decorative Pattern */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
                      <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full -ml-20 -mb-20"></div>
                    </div>
                    
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">سعر الصرف:</span>
                          <span className="font-bold text-foreground">{cardType.exchange_rate} دج/$</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">الحد الأدنى:</span>
                          <span className="font-semibold">${cardType.min_amount}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">الحد الأقصى:</span>
                          <span className="font-semibold">${cardType.max_amount}</span>
                        </div>
                      </div>
                      <Button className="w-full mt-4 gap-2" size="lg">
                        <ShoppingCart className="h-4 w-4" />
                        شراء الآن
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">لا توجد طلبات</p>
                </CardContent>
              </Card>
            ) : (
              orders.map((order) => {
                const cardType = cardTypes.find(c => c.id === order.card_type_id);
                
                return (
                  <Card key={order.id} className="border-0 shadow-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${cardType ? getProviderGradient(cardType.provider) : 'from-primary to-primary'}`}>
                            <CreditCard className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">
                              {cardType?.name_ar || 'بطاقة'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              ${order.amount_usd} - {order.total_dzd} دج
                            </p>
                            <p className="text-sm text-muted-foreground">
                              الحساب: {order.account_id}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(order.created_at).toLocaleString('ar-DZ')}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                      
                      {order.status === 'completed' && (
                        <div className="mt-3 p-3 bg-success/10 rounded-lg border border-success/20">
                          <p className="text-sm font-semibold text-success mb-1">✓ تم إرسال المبلغ إلى حسابك</p>
                          {order.admin_notes && (
                            <p className="text-xs text-muted-foreground">{order.admin_notes}</p>
                          )}
                        </div>
                      )}
                      
                      {order.status === 'failed' && order.admin_notes && (
                        <div className="mt-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                          <p className="text-xs text-muted-foreground">{order.admin_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Purchase Dialog */}
      <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              شراء {selectedCard?.name_ar}
            </DialogTitle>
            <DialogDescription>
              أدخل معلومات حسابك والمبلغ المطلوب
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="accountId">معرف الحساب ({selectedCard?.provider})</Label>
              <Input
                id="accountId"
                placeholder={`أدخل معرف حسابك في ${selectedCard?.name_ar}`}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="amount">المبلغ بالدولار ($)</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  placeholder={`من ${selectedCard?.min_amount} إلى ${selectedCard?.max_amount}`}
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(e.target.value)}
                  className="pr-10"
                  min={selectedCard?.min_amount}
                  max={selectedCard?.max_amount}
                  step="0.01"
                />
              </div>
            </div>

            {totals && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المبلغ:</span>
                  <span className="font-semibold">${amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">سعر الصرف:</span>
                  <span className="font-semibold">{selectedCard.exchange_rate} دج/$</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المبلغ بالدينار:</span>
                  <span className="font-semibold">{totals.amountDzd.toFixed(2)} دج</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">العمولة:</span>
                  <span className="font-semibold">{totals.feeAmount.toFixed(2)} دج</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span>الإجمالي:</span>
                    <span className="text-primary">{totals.totalDzd.toFixed(2)} دج</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 mt-3 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>سيتم خصم المبلغ من رصيدك وسيقوم المشرف بمعالجة الطلب وإرسال المبلغ إلى حسابك</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setSelectedCard(null)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleConfirmPurchase}
              disabled={purchasing || !accountId || !amountUsd || amount < (selectedCard?.min_amount || 0) || amount > (selectedCard?.max_amount || 0)}
            >
              {purchasing ? 'جاري المعالجة...' : 'تأكيد الطلب'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Shop;
