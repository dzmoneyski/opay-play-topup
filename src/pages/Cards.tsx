import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useGiftCards } from '@/hooks/useGiftCards';
import { useBalance } from '@/hooks/useBalance';
import { CreditCard, Wallet, QrCode } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { UnifiedQRScanner } from '@/components/UnifiedQRScanner';

const Cards = () => {
  const [cardCode, setCardCode] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const { redeemGiftCard, loading } = useGiftCards();
  const { balance } = useBalance();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardCode.trim()) return;

    const success = await redeemGiftCard(cardCode);
    if (success) {
      setCardCode('');
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} دج`;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        <BackButton />
        
        {/* Current Balance */}
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">الرصيد الحالي</p>
                <p className="text-2xl font-bold">
                  {balance ? formatCurrency(balance.balance) : '0.00 دج'}
                </p>
              </div>
              <Wallet className="h-8 w-8 opacity-90" />
            </div>
          </CardContent>
        </Card>

        {/* Gift Card Form */}
        <Card className="border-2 border-dashed border-primary/20">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">فعّل بطاقة</CardTitle>
            <CardDescription>
              أدخل كود بطاقة Opal لتعمير حسابك
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Plastic Card Visual */}
              <div className="relative">
                <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <div className="text-sm opacity-80 mb-1">OPAL CARD</div>
                      <div className="text-xs opacity-60">GIFT CARD</div>
                    </div>
                    <div className="w-8 h-6 bg-white/20 rounded"></div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cardCode" className="text-white/80 text-sm block mb-2">
                        رقم البطاقة
                      </Label>
                      <div className="w-full" dir="ltr">
                        <input
                          id="cardCode"
                          type="text"
                          value={cardCode}
                          onChange={(e) => setCardCode(e.target.value.replace(/\D/g, '').slice(0, 12))}
                          maxLength={12}
                          disabled={loading}
                          placeholder="000000000000"
                          className="w-full h-12 bg-white/10 border-2 border-white/20 rounded-lg text-white text-center text-xl font-bold tracking-[0.5em] placeholder:text-white/30 placeholder:tracking-[0.5em] focus:outline-none focus:border-white/50 focus:bg-white/15 transition-all duration-200 disabled:opacity-50"
                          style={{ letterSpacing: '0.5em' }}
                        />
                      </div>
                      <p className="text-xs text-white/60 text-center mt-2" dir="rtl">
                        آخر رقم هو رقم التحقق
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs opacity-60">
                      <span>VALID</span>
                      <span>ALGERIA</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg"
                  disabled={loading || cardCode.length !== 12}
                >
                  {loading ? 'جاري التحقق...' : 'تفعيل'}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted-foreground/20" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">أو</span>
                  </div>
                </div>
                
                <Button 
                  type="button"
                  onClick={() => setShowQRScanner(true)}
                  variant="outline"
                  className="w-full h-12 text-lg border-2 border-primary/20 hover:border-primary/40"
                  disabled={loading}
                >
                  <QrCode className="h-5 w-5 ml-2" />
                  مسح QR كود
                </Button>
              </div>
            </form>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2 text-sm">تعليمات الاستخدام:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• قم بإدخال رقم البطاقة الموجود على الجهة الخلفية</li>
                <li>• تأكد من إدخال الرقم بشكل صحيح</li>
                <li>• لا يمكن استخدام البطاقة أكثر من مرة واحدة</li>
                <li>• سيتم إضافة الرصيد فوراً بعد التحقق</li>
                <li className="text-red-600 font-medium">• تحذير: 3 محاولات خاطئة = إيقاف الحساب 24 ساعة</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* QR Scanner Modal */}
        <UnifiedQRScanner 
          mode="gift-card"
          open={showQRScanner}
          onOpenChange={setShowQRScanner}
          onGiftCardSuccess={redeemGiftCard}
          onSuccess={() => {
            setCardCode('');
          }}
        />

      </div>
    </div>
  );
};

export default Cards;