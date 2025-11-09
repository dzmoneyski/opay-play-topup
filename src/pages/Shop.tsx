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
  Info,
  Lock
} from 'lucide-react';
import redotpayCard from '@/assets/redotpay-card.png';
import payeerCard from '@/assets/payeer-card.png';
import payeerLogo from '@/assets/payeer-logo.png';
import webmoneyCard from '@/assets/webmoney-card.png';
import skrillCard from '@/assets/skrill-card.png';
import perfectmoneyCard from '@/assets/perfectmoney-card.png';
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
  const [viewReceiptImage, setViewReceiptImage] = useState<string | null>(null);

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
    if (!cardType.is_active) {
      return; // Don't open dialog for inactive cards
    }
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

  const getProviderLogo = (provider: string) => {
    const logos: { [key: string]: string } = {
      redotpay: redotpayCard,
      payeer: payeerCard,
      webmoney: webmoneyCard,
      perfectmoney: perfectmoneyCard,
      skrill: skrillCard,
    };
    return logos[provider];
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

      <div className="container mx-auto px-3 py-4 md:px-4 md:py-6">
        <Tabs defaultValue="shop" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-11 md:h-10">
            <TabsTrigger value="shop" className="gap-1.5 md:gap-2 text-sm md:text-base">
              <ShoppingCart className="h-4 w-4" />
              المتجر
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5 md:gap-2 text-sm md:text-base">
              <Package className="h-4 w-4" />
              طلباتي ({orders.length})
            </TabsTrigger>
          </TabsList>

          {/* Shop Tab */}
          <TabsContent value="shop" className="space-y-4 md:space-y-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {cardTypes.map((cardType) => {
                  const providerLogo = getProviderLogo(cardType.provider);
                  
                  return (
                    <div 
                      key={cardType.id} 
                      className={`group transition-all duration-300 ${cardType.is_active ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}`}
                      onClick={() => handleCardClick(cardType)}
                    >
                      {/* Realistic Card with Real Image Background */}
                      <div className="relative w-full aspect-[1.586/1] rounded-xl md:rounded-2xl shadow-xl overflow-hidden border border-white/10">
                        {/* Background Image */}
                        {providerLogo ? (
                          <img 
                            src={providerLogo} 
                            alt={cardType.name}
                            className={`absolute inset-0 w-full h-full object-cover ${cardType.is_active ? 'brightness-105' : 'brightness-75 saturate-50'}`}
                          />
                        ) : (
                          <div className={`absolute inset-0 bg-gradient-to-br ${getProviderGradient(cardType.provider)} ${!cardType.is_active && 'opacity-60'}`}></div>
                        )}
                        
                        {/* Inactive Overlay */}
                        {!cardType.is_active && (
                          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] z-20"></div>
                        )}
                        
                        {/* Lock Icon for Inactive Cards */}
                        {!cardType.is_active && (
                          <div className="absolute inset-0 z-30 flex items-center justify-center">
                            <div className="bg-black/70 backdrop-blur-sm rounded-full p-6 md:p-8 border-2 border-white/30 shadow-lg">
                              <Lock className="h-12 w-12 md:h-16 md:w-16 text-white drop-shadow-lg" strokeWidth={2.5} />
                            </div>
                          </div>
                        )}
                        
                        {/* Subtle Dark Overlay for Better Text Readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                        
                        {/* Content Overlay */}
                        <div className="relative z-10 h-full p-4 md:p-6 flex flex-col justify-between">
                          {/* Top Logo for Payeer */}
                          {cardType.provider === 'payeer' && (
                            <div className="flex justify-start">
                              <img 
                                src={payeerLogo} 
                                alt="Payeer"
                                className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-lg rounded-full"
                                style={{ mixBlendMode: 'multiply' }}
                              />
                            </div>
                          )}
                          
                          {/* Card Info at Bottom */}
                          <div className="mt-auto space-y-2 md:space-y-3">
                            {/* Card Name */}
                            <div className="space-y-1">
                              <h3 className="text-lg md:text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] [text-shadow:_2px_2px_4px_rgb(0_0_0_/_80%)]">
                                {cardType.name}
                              </h3>
                            </div>
                            
                            {/* Card Info Grid */}
                            <div className="grid grid-cols-3 gap-1.5 md:gap-2 bg-black/70 backdrop-blur-md rounded-lg md:rounded-xl p-2 md:p-3 border-2 border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                              <div className="space-y-0.5 md:space-y-1">
                                <p className="text-white/90 text-[9px] md:text-xs font-medium">سعر الصرف:</p>
                                <p className="text-white font-bold text-[10px] md:text-sm drop-shadow-md">{cardType.exchange_rate} دج/$</p>
                              </div>
                              <div className="space-y-0.5 md:space-y-1">
                                <p className="text-white/90 text-[9px] md:text-xs font-medium">الحد الأدنى:</p>
                                <p className="text-white font-bold text-[10px] md:text-sm drop-shadow-md">${cardType.min_amount}</p>
                              </div>
                              <div className="space-y-0.5 md:space-y-1">
                                <p className="text-white/90 text-[9px] md:text-xs font-medium">الحد الأقصى:</p>
                                <p className="text-white font-bold text-[10px] md:text-sm drop-shadow-md">${cardType.max_amount}</p>
                              </div>
                            </div>
                            
                            {/* Action Button */}
                            <Button 
                              className={`w-full backdrop-blur-sm text-white border font-bold gap-1.5 md:gap-2 shadow-lg transition-all text-sm md:text-base h-10 md:h-11 ${
                                cardType.is_active 
                                  ? 'bg-white/20 hover:bg-white/30 border-white/30 group-hover:bg-white/40' 
                                  : 'bg-black/40 border-white/20 cursor-not-allowed opacity-60'
                              }`}
                              disabled={!cardType.is_active}
                            >
                              {cardType.is_active ? (
                                <>
                                  <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
                                  شراء الآن
                                </>
                              ) : (
                                <>
                                  <Lock className="h-4 w-4 md:h-5 md:w-5" />
                                  غير متاح حالياً
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        {/* Holographic Effect on Hover */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                        <div className="mt-3 space-y-3">
                          <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                            <p className="text-sm font-semibold text-success mb-2">✓ تم إرسال المبلغ إلى حسابك</p>
                            {order.admin_notes && (
                              <p className="text-xs text-muted-foreground whitespace-pre-line">{order.admin_notes}</p>
                            )}
                          </div>
                          
                          {order.transaction_reference && (
                            <div className="p-3 bg-muted/50 rounded-lg border">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">معرف المعاملة:</p>
                              <code className="text-sm font-mono">{order.transaction_reference}</code>
                            </div>
                          )}
                          
                          {order.receipt_image && (
                            <div className="p-3 bg-muted/50 rounded-lg border">
                              <p className="text-xs font-semibold text-muted-foreground mb-2">وصل الدفع (اضغط للعرض):</p>
                              <img 
                                src={order.receipt_image} 
                                alt="وصل الدفع" 
                                className="w-full max-h-60 object-contain rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setViewReceiptImage(order.receipt_image!)}
                              />
                            </div>
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

      {/* Receipt Viewer Dialog */}
      <Dialog open={!!viewReceiptImage} onOpenChange={() => setViewReceiptImage(null)}>
        <DialogContent className="sm:max-w-4xl p-2" dir="rtl">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>وصل الدفع</DialogTitle>
            <DialogDescription>
              يمكنك تحميل الصورة أو مشاركتها
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <img 
              src={viewReceiptImage || ''} 
              alt="وصل الدفع" 
              className="w-full h-auto rounded-lg"
            />
          </div>
          <DialogFooter className="px-4 pb-4">
            <Button
              variant="outline"
              onClick={() => {
                if (viewReceiptImage) {
                  window.open(viewReceiptImage, '_blank');
                }
              }}
            >
              فتح في علامة تبويب جديدة
            </Button>
            <Button
              onClick={() => setViewReceiptImage(null)}
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Shop;
