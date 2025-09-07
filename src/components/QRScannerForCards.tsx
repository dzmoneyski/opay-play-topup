import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useGiftCards } from '@/hooks/useGiftCards';
import { Camera, X, QrCode, StopCircle, CreditCard } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

interface QRScannerForCardsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const QRScannerForCards: React.FC<QRScannerForCardsProps> = ({ 
  open, 
  onOpenChange, 
  onSuccess 
}) => {
  const [step, setStep] = useState<'choose' | 'camera' | 'manual'>('choose');
  const [scannedCode, setScannedCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const { redeemGiftCard, loading } = useGiftCards();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  const handleQRResult = async (data: string) => {
    try {
      // Try to parse as JSON first (for structured QR codes)
      let cardCode = '';
      try {
        const qrData = JSON.parse(data);
        if (qrData.type === 'opal_gift_card' && qrData.cardCode) {
          cardCode = qrData.cardCode;
        } else {
          // If not structured, treat as plain text
          cardCode = data.replace(/\D/g, '').slice(0, 12);
        }
      } catch {
        // If not JSON, treat as plain text
        cardCode = data.replace(/\D/g, '').slice(0, 12);
      }

      if (cardCode && cardCode.length >= 11) {
        setScannedCode(cardCode);
        stopCamera();
        
        // Auto-redeem the card
        const success = await redeemGiftCard(cardCode);
        if (success) {
          onSuccess?.();
          handleClose();
        }
      } else {
        toast({
          title: "كود غير صحيح",
          description: "الكود المسحوب لا يحتوي على رقم بطاقة صحيح",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "خطأ في قراءة الكود",
        description: "لم نتمكن من قراءة الكود بشكل صحيح",
        variant: "destructive"
      });
    }
  };

  const startCamera = async () => {
    try {
      setIsScanning(true);
      setStep('camera');
      
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
        
        codeReader.current = new BrowserMultiFormatReader();
        
        try {
          await codeReader.current.decodeFromVideoDevice(
            null,
            videoRef.current,
            (result, error) => {
              if (result) {
                handleQRResult(result.getText());
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
      setStep('choose');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (codeReader.current) {
      codeReader.current.reset();
    }
    
    setIsScanning(false);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const success = await redeemGiftCard(manualCode);
    if (success) {
      onSuccess?.();
      handleClose();
    }
  };

  const resetForm = () => {
    stopCamera();
    setStep('choose');
    setScannedCode('');
    setManualCode('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {step === 'choose' && 'مسح بطاقة الهدايا'}
            {step === 'camera' && 'امسح QR كود البطاقة'}
            {step === 'manual' && 'إدخال رقم البطاقة'}
          </DialogTitle>
        </DialogHeader>

        {step === 'choose' ? (
          <div className="space-y-4">
            <div className="text-center p-6">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
              
              <p className="text-lg font-medium mb-6">اختر طريقة إدخال البطاقة</p>
              
              <div className="space-y-3">
                <Button
                  onClick={startCamera}
                  className="w-full h-14 text-lg font-medium bg-primary hover:bg-primary/90"
                >
                  <Camera className="h-6 w-6 ml-2" />
                  مسح QR كود
                </Button>
                
                <Button
                  onClick={() => setStep('manual')}
                  variant="outline"
                  className="w-full h-14 text-lg font-medium border-2"
                >
                  <QrCode className="h-6 w-6 ml-2" />
                  إدخال يدوي
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground mt-4">
                يمكنك مسح QR كود البطاقة أو إدخال الرقم يدوياً
              </p>
            </div>
          </div>
        ) : step === 'camera' ? (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover"
                playsInline
                muted
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white/50 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                  
                  {/* Card icon in center */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CreditCard className="h-8 w-8 text-white/70" />
                  </div>
                </div>
              </div>
              
              {/* Instructions overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-white text-sm text-center font-medium">
                    وجّه الكاميرا نحو QR كود البطاقة
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-center space-y-3">
              <Button
                onClick={() => {
                  stopCamera();
                  setStep('choose');
                }}
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                <StopCircle className="h-4 w-4 ml-2" />
                إيقاف الكاميرا
              </Button>
              
              <Button
                onClick={() => {
                  stopCamera();
                  setStep('manual');
                }}
                variant="ghost"
                className="w-full text-sm"
                disabled={loading}
              >
                أو إدخال الرقم يدوياً
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Manual Card Input */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl p-6 text-white shadow-lg">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="text-sm opacity-80 mb-1">OPAL CARD</div>
                  <div className="text-xs opacity-60">GIFT CARD</div>
                </div>
                <div className="w-8 h-6 bg-white/20 rounded"></div>
              </div>
              
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="manualCode" className="text-white/80 text-sm block mb-2">
                    رقم البطاقة
                  </Label>
                  <Input
                    id="manualCode"
                    type="text"
                    placeholder="123456789012"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    className="bg-white/10 border-white/20 text-white text-lg font-bold placeholder:text-white/40"
                    maxLength={12}
                    dir="ltr"
                    disabled={loading}
                  />
                  <p className="text-xs text-white/60 mt-1">
                    أدخل الرقم الموجود على البطاقة (12 رقم)
                  </p>
                </div>
                
                <div className="flex justify-between items-center text-xs opacity-60">
                  <span>VALID</span>
                  <span>ALGERIA</span>
                </div>
              </form>
            </div>

            <div className="flex space-x-2 space-x-reverse">
              <Button
                onClick={() => setStep('choose')}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                رجوع
              </Button>
              
              <Button
                onClick={handleManualSubmit}
                className="flex-1"
                disabled={loading || manualCode.length < 11}
              >
                {loading ? 'جاري التحقق...' : 'تفعيل البطاقة'}
              </Button>
            </div>
            
            <div className="text-center">
              <Button
                onClick={() => {
                  setStep('camera');
                  startCamera();
                }}
                variant="ghost"
                className="text-sm"
                disabled={loading}
              >
                أو امسح QR كود
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};