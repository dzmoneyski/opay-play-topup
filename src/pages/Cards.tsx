import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useGiftCards } from '@/hooks/useGiftCards';
import { useBalance } from '@/hooks/useBalance';
import { CreditCard, Wallet } from 'lucide-react';
import BackButton from '@/components/BackButton';

const Cards = () => {
  const [cardCode, setCardCode] = useState('');
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
              <div className="relative max-w-sm mx-auto">
                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-2xl p-6 text-white shadow-2xl shadow-blue-500/20">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <div className="text-base font-bold opacity-90 mb-0.5">OPAL CARD</div>
                      <div className="text-xs opacity-70 tracking-wider">GIFT CARD</div>
                    </div>
                    <div className="w-10 h-7 bg-gradient-to-br from-yellow-400/30 to-orange-400/30 rounded backdrop-blur-sm border border-white/20"></div>
                  </div>
                  
                  <div className="space-y-5">
                    <div>
                      <Label htmlFor="cardCode" className="text-white/70 text-xs block mb-3 tracking-wide">
                        رقم البطاقة
                      </Label>
                      <Input
                        id="cardCode"
                        type="text"
                        value={cardCode}
                        onChange={(e) => setCardCode(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        placeholder="000000000000"
                        maxLength={12}
                        disabled={loading}
                        className="bg-white/5 border-white/10 text-white text-center text-xl font-mono font-bold tracking-wide placeholder:text-white/30 placeholder:tracking-wide focus:bg-white/10 focus:border-white/30 h-14 backdrop-blur-sm"
                        dir="ltr"
                      />
                      <p className="text-xs text-white/50 text-center mt-2.5 tracking-wide" dir="rtl">
                        أدخل الرقم المكون من 12 خانة (آخر رقم للتحقق)
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs opacity-50 tracking-widest pt-2 border-t border-white/10">
                      <span>VALID</span>
                      <span>ALGERIA</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-12 text-lg"
                disabled={loading || cardCode.length !== 12}
              >
                {loading ? 'جاري التحقق...' : 'تفعيل'}
              </Button>
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

      </div>
    </div>
  );
};

export default Cards;