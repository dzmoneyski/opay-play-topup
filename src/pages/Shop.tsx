import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BackButton from '@/components/BackButton';
import { useDigitalCards } from '@/hooks/useDigitalCards';
import { useBalance } from '@/hooks/useBalance';
import { useAuth } from '@/hooks/useAuth';
import {
  ShoppingBag,
  Wallet,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  EyeOff,
  Package,
  ShoppingCart
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Shop = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance } = useBalance();
  const { cardTypes, denominations, orders, loading, purchasing, purchaseCard } = useDigitalCards();
  const [selectedCard, setSelectedCard] = useState<{ denominationId: string; cardTypeId: string; price: number } | null>(null);
  const [showBalance, setShowBalance] = useState(true);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handlePurchaseClick = (denominationId: string, cardTypeId: string, price: number) => {
    setSelectedCard({ denominationId, cardTypeId, price });
  };

  const handleConfirmPurchase = async () => {
    if (!selectedCard) return;

    const success = await purchaseCard(selectedCard.denominationId, selectedCard.cardTypeId);
    if (success) {
      setSelectedCard(null);
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

  const getDenominationsForCard = (cardTypeId: string) => {
    return denominations.filter(d => d.card_type_id === cardTypeId);
  };

  const getProviderColor = (provider: string) => {
    const colors: { [key: string]: string } = {
      redotpay: 'bg-gradient-to-br from-red-500 to-red-600',
      payeer: 'bg-gradient-to-br from-blue-500 to-blue-600',
      webmoney: 'bg-gradient-to-br from-purple-500 to-purple-600',
      perfectmoney: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      skrill: 'bg-gradient-to-br from-violet-500 to-violet-600',
    };
    return colors[provider] || 'bg-gradient-primary';
  };

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="h-10 bg-muted rounded" />
                        <div className="h-10 bg-muted rounded" />
                      </div>
                    </CardContent>
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
                {cardTypes.map((cardType) => {
                  const cardDenominations = getDenominationsForCard(cardType.id);
                  
                  return (
                    <Card key={cardType.id} className="border-0 shadow-card hover:shadow-elevated transition-all">
                      <CardHeader className={`${getProviderColor(cardType.provider)} text-white rounded-t-lg`}>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <CreditCard className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle className="text-white">{cardType.name_ar}</CardTitle>
                            <CardDescription className="text-white/80 text-sm">
                              {cardType.description_ar || cardType.name}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {cardDenominations.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4 text-sm">
                            لا توجد فئات متاحة
                          </p>
                        ) : (
                          cardDenominations.map((denomination) => (
                            <div
                              key={denomination.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                              <div>
                                <p className="font-semibold text-foreground">
                                  ${denomination.amount} {cardType.currency}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {denomination.price_dzd.toFixed(2)} دج
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handlePurchaseClick(denomination.id, cardType.id, denomination.price_dzd)}
                                disabled={purchasing || denomination.stock_quantity === 0}
                                className="gap-2"
                              >
                                <ShoppingCart className="h-4 w-4" />
                                {denomination.stock_quantity === 0 ? 'نفذت الكمية' : 'شراء'}
                              </Button>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
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
                          <div className={`p-2 rounded-lg ${cardType ? getProviderColor(cardType.provider) : 'bg-gradient-primary'}`}>
                            <CreditCard className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">
                              {cardType?.name_ar || 'بطاقة'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              ${order.amount} - {order.price_paid} دج
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(order.created_at).toLocaleString('ar-DZ')}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                      
                      {order.status === 'completed' && order.card_code && (
                        <div className="mt-3 p-3 bg-success/10 rounded-lg border border-success/20">
                          <p className="text-xs text-muted-foreground mb-1">رمز البطاقة:</p>
                          <p className="font-mono font-bold text-success">{order.card_code}</p>
                          {order.card_pin && (
                            <>
                              <p className="text-xs text-muted-foreground mb-1 mt-2">رقم PIN:</p>
                              <p className="font-mono font-bold text-success">{order.card_pin}</p>
                            </>
                          )}
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

      {/* Purchase Confirmation Dialog */}
      <AlertDialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الشراء</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من شراء هذه البطاقة؟
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">السعر:</span>
                  <span className="font-bold">{selectedCard?.price.toFixed(2)} دج</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">رصيدك الحالي:</span>
                  <span className="font-bold">{(balance?.balance ?? 0).toFixed(2)} دج</span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">الرصيد بعد الشراء:</span>
                  <span className="font-bold">
                    {((balance?.balance ?? 0) - (selectedCard?.price ?? 0)).toFixed(2)} دج
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPurchase} disabled={purchasing}>
              {purchasing ? 'جاري الشراء...' : 'تأكيد الشراء'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Shop;
