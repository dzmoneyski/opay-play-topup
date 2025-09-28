import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTransfers } from '@/hooks/useTransfers';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { Separator } from '@/components/ui/separator';
import { Camera, X, Send, User, Phone, QrCode, StopCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { BrowserMultiFormatReader } from '@zxing/library';

interface QRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ScannedUser {
  userId: string;
  fullName: string;
  phone: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({ open, onOpenChange }) => {
  const [step, setStep] = useState<'choose' | 'scan' | 'confirm' | 'show-qr' | 'camera'>('choose');
  const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const { processTransfer } = useTransfers();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  const handleQRResult = (data: string) => {
    try {
      const qrData = JSON.parse(data);
      if (qrData.type === 'opay_user' && qrData.userId && qrData.fullName && qrData.phone) {
        setScannedUser({
          userId: qrData.userId,
          fullName: qrData.fullName,
          phone: qrData.phone
        });
        setStep('confirm');
      } else {
        throw new Error('Invalid QR code format');
      }
    } catch (error) {
      toast({
        title: "خطأ في قراءة الكود",
        description: "الكود المسحوب غير صحيح أو لا يخص منصة OpaY",
        variant: "destructive"
      });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Create a simple QR code reader using canvas
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        // For demo purposes, we'll simulate a QR scan
        // In production, you'd use a proper QR code library like jsQR
        toast({
          title: "قراءة الصورة",
          description: "يرجى استخدام الكاميرا أو إدخال البيانات يدوياً",
        });
      };
      
      img.src = URL.createObjectURL(file);
    } catch (error) {
      toast({
        title: "خطأ في قراءة الصورة",
        description: "لم نتمكن من قراءة الكود من الصورة",
        variant: "destructive"
      });
    }
  };

  const generateQRCode = async () => {
    if (!profile || !user) return;

    try {
      const qrData = {
        type: 'opay_user',
        userId: user.id,
        fullName: profile.full_name || 'مستخدم OpaY',
        phone: profile.phone || '',
        timestamp: Date.now()
      };

      const qrString = JSON.stringify(qrData);
      const url = await QRCode.toDataURL(qrString, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
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
    if (step === 'show-qr' && profile && user) {
      generateQRCode();
    }
  }, [step, profile, user]);

  const handleTransfer = async () => {
    if (!scannedUser || !amount || parseFloat(amount) <= 0) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى التأكد من صحة المبلغ",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await processTransfer({
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

  const startCamera = async () => {
    try {
      setIsScanning(true);
      setStep('camera');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Initialize QR code reader
        codeReader.current = new BrowserMultiFormatReader();
        
        // Start scanning
        try {
          const result = await codeReader.current.decodeFromVideoDevice(
            null, // Use default device
            videoRef.current,
            (result, error) => {
              if (result) {
                handleQRResult(result.getText());
                stopCamera();
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
      setStep('scan');
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
    setIsProcessing(false);
  };

  // Cleanup on component unmount or dialog close
  useEffect(() => {
    if (!open) {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open]);

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {step === 'choose' && 'مسح QR كود'}
            {step === 'scan' && 'مسح QR كود'}
            {step === 'camera' && 'امسح QR كود'}
            {step === 'confirm' && 'تأكيد التحويل'}
            {step === 'show-qr' && 'QR كود الخاص بك'}
          </DialogTitle>
        </DialogHeader>

        {step === 'choose' ? (
          <div className="space-y-4">
            <div className="text-center p-6">
              <p className="text-lg font-medium mb-6">اختر العملية المطلوبة</p>
              
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={startCamera}
                  className="flex-col h-24 text-lg font-medium bg-primary hover:bg-primary/90"
                >
                  <Camera className="h-8 w-8 mb-2" />
                  إرسال
                </Button>
                
                <Button
                  onClick={() => setStep('show-qr')}
                  variant="outline"
                  className="flex-col h-24 text-lg font-medium border-2"
                >
                  <QrCode className="h-8 w-8 mb-2" />
                  استقبال
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground mt-4">
                إرسال: امسح QR كود لإرسال الأموال<br/>
                استقبال: اعرض QR كود الخاص بك للآخرين
              </p>
            </div>
          </div>
        ) : step === 'show-qr' ? (
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
                    <p className="font-medium">{profile?.full_name || 'مستخدم OpaY'}</p>
                    <div className="flex items-center justify-center space-x-2 space-x-reverse text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{profile?.phone || 'رقم الهاتف'}</span>
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
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                وجّه الكاميرا نحو QR كود المستلم
              </p>
              
              <Button
                onClick={() => {
                  stopCamera();
                  setStep('choose');
                }}
                variant="outline"
                className="w-full"
              >
                <StopCircle className="h-4 w-4 ml-2" />
                إيقاف الكاميرا
              </Button>
            </div>
          </div>
        ) : step === 'scan' ? (
          <div className="space-y-4">
            <div className="text-center p-8 border-2 border-dashed border-muted rounded-lg">
              <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                اطلب من المستلم عرض QR كود خاص به
              </p>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline" 
                  className="w-full"
                >
                  اختر صورة من المعرض
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                <p className="text-xs text-muted-foreground">
                  أو يمكنك إدخال البيانات يدوياً أدناه
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label htmlFor="manual-phone">رقم الهاتف</Label>
              <Input
                id="manual-phone"
                placeholder="0123456789"
                onChange={(e) => {
                  const phone = e.target.value;
                  if (phone.length >= 10) {
                    // Simulate finding user by phone
                    setScannedUser({
                      userId: 'manual-entry',
                      fullName: 'مستخدم عبر الهاتف',
                      phone: phone
                    });
                    setStep('confirm');
                  }
                }}
              />
            </div>
            
            <Button
              onClick={() => setStep('choose')}
              variant="outline"
              className="w-full"
            >
              رجوع
            </Button>
          </div>
        ) : (
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
              >
                إلغاء
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={isProcessing || !amount || parseFloat(amount) <= 0}
                className="flex-1"
              >
                {isProcessing ? (
                  "جاري التحويل..."
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