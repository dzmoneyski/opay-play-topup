import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useGiftCards } from '@/hooks/useGiftCards';
import { useBalance } from '@/hooks/useBalance';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Wallet, QrCode, Truck } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { BrowserMultiFormatReader } from '@zxing/library';
import { useNavigate } from 'react-router-dom';

const Cards = () => {
  const navigate = useNavigate();
  const [cardCode, setCardCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const { redeemGiftCard, loading } = useGiftCards();
  const { balance } = useBalance();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const codeReaderRef = React.useRef<BrowserMultiFormatReader | null>(null);
  const { toast } = useToast();

  const formatCardDisplay = (value: string) => {
    if (value.length <= 11) return value;
    return `${value.slice(0, 11)}-${value.slice(11)}`;
  };

  const startScanner = async () => {
    try {
      setIsScanning(true);
      setShowScanner(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        codeReaderRef.current = new BrowserMultiFormatReader();
        
        try {
          await codeReaderRef.current.decodeFromVideoDevice(
            null,
            videoRef.current,
            (result) => {
              if (result) {
                const scannedText = result.getText();
                const numbersOnly = scannedText.replace(/\D/g, '').slice(0, 12);
                if (numbersOnly.length === 12) {
                  setCardCode(numbersOnly);
                  stopScanner();
                  toast({
                    title: "تم المسح",
                    description: "تم قراءة رمز البطاقة بنجاح",
                  });
                }
              }
            }
          );
        } catch (err) {
          console.error('QR scanning error:', err);
        }
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast({
        title: "خطأ في الوصول للكاميرا",
        description: "لم نتمكن من الوصول للكاميرا. يرجى التأكد من الأذونات.",
        variant: "destructive"
      });
      setShowScanner(false);
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    
    setIsScanning(false);
    setShowScanner(false);
  };

  React.useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

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

        {/* Order Card Delivery Button */}
        <Button 
          onClick={() => navigate('/card-delivery')}
          variant="outline"
          size="lg"
          className="w-full h-16 text-base gap-3 border-2 hover:bg-primary/5"
        >
          <Truck className="h-6 w-6" />
          <div className="text-right">
            <div className="font-bold">اطلب بطاقة إلى المنزل</div>
            <div className="text-xs text-muted-foreground">الدفع عند الاستلام</div>
          </div>
        </Button>

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
                        value={formatCardDisplay(cardCode)}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/\D/g, '').slice(0, 12);
                          setCardCode(cleaned);
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pastedText = e.clipboardData.getData('text');
                          const numbersOnly = pastedText.replace(/\D/g, '').slice(0, 12);
                          setCardCode(numbersOnly);
                        }}
                        placeholder="00000000000-0"
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

              {/* QR Scanner Button */}
              <Button 
                type="button"
                onClick={startScanner}
                variant="outline"
                className="w-full h-12 text-base gap-2"
                disabled={loading || isScanning}
              >
                <QrCode className="h-5 w-5" />
                مسح QR Code
              </Button>

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

        {/* QR Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
            <div className="container flex flex-col h-full max-w-md mx-auto p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">مسح QR Code البطاقة</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={stopScanner}
                >
                  إغلاق
                </Button>
              </div>
              <div className="flex-1 relative">
                <div className="relative bg-black rounded-lg overflow-hidden h-96">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    وجّه الكاميرا نحو QR كود البطاقة
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Cards;