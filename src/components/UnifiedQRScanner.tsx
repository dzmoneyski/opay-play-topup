import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Camera, X, Send, User, Phone, QrCode, StopCircle, CreditCard } from 'lucide-react';
import QRCode from 'qrcode';
import { BrowserMultiFormatReader } from '@zxing/library';

interface ScannedUser {
  userId: string;
  fullName: string;
  phone: string;
}

interface UnifiedQRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'transfer' | 'gift-card';
  onTransferSuccess?: (data: { recipient_phone: string; amount: number; note?: string }) => Promise<{ success: boolean; error?: string }>;
  onGiftCardSuccess?: (cardCode: string) => Promise<boolean>;
  onSuccess?: () => void;
  userProfile?: { full_name?: string; phone?: string };
  userId?: string;
}

export const UnifiedQRScanner: React.FC<UnifiedQRScannerProps> = ({
  open,
  onOpenChange,
  mode,
  onTransferSuccess,
  onGiftCardSuccess,
  onSuccess,
  userProfile,
  userId
}) => {
  const [step, setStep] = useState<'choose' | 'scan' | 'confirm' | 'show-qr' | 'camera' | 'manual'>('choose');
  const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  const handleQRResult = async (data: string) => {
    try {
      if (mode === 'gift-card') {
        // Handle gift card QR
        let cardCode = '';
        try {
          const qrData = JSON.parse(data);
          if (qrData.type === 'opal_gift_card' && qrData.cardCode) {
            cardCode = qrData.cardCode;
          } else {
            cardCode = data.replace(/\D/g, '').slice(0, 12);
          }
        } catch {
          cardCode = data.replace(/\D/g, '').slice(0, 12);
        }

        if (cardCode && cardCode.length >= 11 && onGiftCardSuccess) {
          stopCamera();
          const success = await onGiftCardSuccess(cardCode);
          if (success) {
            onSuccess?.();
            handleClose();
          }
        } else {
          throw new Error('Invalid gift card code');
        }
      } else {
        // Handle transfer QR
        const qrData = JSON.parse(data);
        if (qrData.type === 'opay_user' && qrData.userId && qrData.fullName && qrData.phone) {
          setScannedUser({
            userId: qrData.userId,
            fullName: qrData.fullName,
            phone: qrData.phone
          });
          setStep('confirm');
          stopCamera();
        } else {
          throw new Error('Invalid transfer QR code format');
        }
      }
    } catch (error) {
      toast({
        title: "خطأ في قراءة الكود",
        description: mode === 'gift-card' 
          ? "الكود المسحوب لا يحتوي على رقم بطاقة صحيح"
          : "الكود المسحوب غير صحيح أو لا يخص منصة OpaY",
        variant: "destructive"
      });
    }
  };

  const generateQRCode = async () => {
    if (!userProfile || !userId) return;

    try {
      const qrData = {
        type: 'opay_user',
        userId: userId,
        fullName: userProfile.full_name || 'مستخدم OpaY',
        phone: userProfile.phone || '',
        timestamp: Date.now()
      };

      const qrString = JSON.stringify(qrData);
      const url = await QRCode.toDataURL(qrString, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' },
        width: 256,
      });

      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "خطأ في إنشاء الكود",
        description: "لم نتمكن من إنشاء QR كود",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (step === 'show-qr' && userProfile && userId) {
      generateQRCode();
    }
  }, [step, userProfile, userId]);

  const handleTransfer = async () => {
    if (!scannedUser || !amount || parseFloat(amount) <= 0 || !onTransferSuccess) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى التأكد من صحة المبلغ",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await onTransferSuccess({
        recipient_phone: scannedUser.phone,
        amount: parseFloat(amount),
        note: note || `تحويل عبر QR إلى ${scannedUser.fullName}`
      });

      if (result.success) {
        toast({
          title: "تم التحويل بنجاح",
          description: `تم تحويل ${amount} دج إلى ${scannedUser.fullName}`,
        });
        onOpenChange(false);
        resetForm();
      } else {
        toast({
          title: "فشل التحويل",
          description: result.error || "حدث خطأ أثناء التحويل",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "فشل التحويل",
        description: "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'gift-card' && manualCode.trim() && onGiftCardSuccess) {
      const success = await onGiftCardSuccess(manualCode);
      if (success) {
        onSuccess?.();
        handleClose();
      }
    } else if (mode === 'transfer' && manualCode.length >= 10) {
      setScannedUser({
        userId: 'manual-entry',
        fullName: 'مستخدم عبر الهاتف',
        phone: manualCode
      });
      setStep('confirm');
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

  const resetForm = () => {
    stopCamera();
    setStep('choose');
    setScannedUser(null);
    setAmount('');
    setNote('');
    setManualCode('');
    setIsProcessing(false);
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

  const getTitle = () => {
    if (mode === 'gift-card') {
      if (step === 'choose') return 'مسح بطاقة الهدايا';
      if (step === 'camera') return 'امسح QR كود البطاقة';
      if (step === 'manual') return 'إدخال رقم البطاقة';
    } else {
      if (step === 'choose') return 'مسح QR كود';
      if (step === 'scan' || step === 'camera') return 'امسح QR كود';
      if (step === 'confirm') return 'تأكيد التحويل';
      if (step === 'show-qr') return 'QR كود الخاص بك';
    }
    return 'QR Scanner';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{getTitle()}</DialogTitle>
        </DialogHeader>

        {/* Choose Mode */}
        {step === 'choose' && (
          <div className="space-y-4">
            <div className="text-center p-6">
              {mode === 'gift-card' ? (
                <>
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                    <CreditCard className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-lg font-medium mb-6">اختر طريقة إدخال البطاقة</p>
                  <div className="space-y-3">
                    <Button
                      onClick={startCamera}
                      className="w-full h-14 text-lg font-medium"
                    >
                      <Camera className="h-6 w-6 ml-2" />
                      مسح QR كود
                    </Button>
                    <Button
                      onClick={() => setStep('manual')}
                      variant="outline"
                      className="w-full h-14 text-lg font-medium"
                    >
                      <QrCode className="h-6 w-6 ml-2" />
                      إدخال يدوي
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium mb-6">اختر العملية المطلوبة</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={startCamera}
                      className="flex-col h-24 text-lg font-medium"
                    >
                      <Camera className="h-8 w-8 mb-2" />
                      إرسال
                    </Button>
                    <Button
                      onClick={() => setStep('show-qr')}
                      variant="outline"
                      className="flex-col h-24 text-lg font-medium"
                    >
                      <QrCode className="h-8 w-8 mb-2" />
                      استقبال
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Camera Scanning */}
        {step === 'camera' && (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover"
                playsInline
                muted
              />
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white/50 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                  {mode === 'gift-card' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <CreditCard className="h-8 w-8 text-white/70" />
                    </div>
                  )}
                </div>
              </div>

              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-white text-sm text-center font-medium">
                    {mode === 'gift-card' 
                      ? 'وجّه الكاميرا نحو QR كود البطاقة'
                      : 'وجّه الكاميرا نحو QR كود المستلم'
                    }
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
                disabled={isProcessing}
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
                disabled={isProcessing}
              >
                {mode === 'gift-card' ? 'أو إدخال الرقم يدوياً' : 'أو إدخال رقم الهاتف'}
              </Button>
            </div>
          </div>
        )}

        {/* Manual Input */}
        {step === 'manual' && (
          <div className="space-y-6">
            {mode === 'gift-card' ? (
              <div className="bg-gradient-primary rounded-xl p-6 text-white shadow-elevated">
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
                      disabled={isProcessing}
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
            ) : (
              <div className="space-y-3">
                <Label htmlFor="manual-phone">رقم الهاتف</Label>
                <Input
                  id="manual-phone"
                  placeholder="0123456789"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                />
              </div>
            )}

            <div className="flex space-x-2 space-x-reverse">
              <Button
                onClick={() => setStep('choose')}
                variant="outline"
                className="flex-1"
                disabled={isProcessing}
              >
                رجوع
              </Button>
              
              <Button
                onClick={handleManualSubmit}
                className="flex-1"
                disabled={isProcessing || manualCode.length < (mode === 'gift-card' ? 11 : 10)}
              >
                {isProcessing ? 'جاري المعالجة...' : 
                 mode === 'gift-card' ? 'تفعيل البطاقة' : 'تأكيد'}
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
                disabled={isProcessing}
              >
                أو امسح QR كود
              </Button>
            </div>
          </div>
        )}

        {/* Show QR Code */}
        {step === 'show-qr' && mode === 'transfer' && (
          <div className="space-y-4">
            <div className="text-center p-6">
              {qrCodeUrl ? (
                <div className="space-y-4">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code"
                    className="mx-auto rounded-lg border w-48 h-48"
                  />
                  
                  <div className="space-y-2">
                    <p className="font-medium">{userProfile?.full_name || 'مستخدم OpaY'}</p>
                    <div className="flex items-center justify-center space-x-2 space-x-reverse text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{userProfile?.phone || 'رقم الهاتف'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-48 h-48 mx-auto mb-4 bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <QrCode className="h-16 w-16 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">جاري إنشاء QR كود...</p>
                  </div>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground mt-4">
                اطلب من الآخرين مسح هذا الكود لتحويل الأموال إليك
              </p>
            </div>
            
            <Button
              onClick={() => setStep('choose')}
              variant="outline"
              className="w-full"
            >
              رجوع
            </Button>
          </div>
        )}

        {/* Transfer Confirmation */}
        {step === 'confirm' && mode === 'transfer' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="p-2 rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{scannedUser?.fullName}</p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="h-3 w-3 ml-1" />
                      {scannedUser?.phone}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Label htmlFor="amount">المبلغ (دج)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="note">ملاحظة (اختيارية)</Label>
              <Input
                id="note"
                placeholder="إضافة ملاحظة..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="flex space-x-2 space-x-reverse pt-4">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1"
                disabled={isProcessing}
              >
                إلغاء
              </Button>
              
              <Button
                onClick={handleTransfer}
                className="flex-1"
                disabled={isProcessing || !amount || parseFloat(amount) <= 0}
              >
                {isProcessing ? (
                  <>جاري التحويل...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 ml-2" />
                    تحويل
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};