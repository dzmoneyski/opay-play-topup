import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTransfers } from '@/hooks/useTransfers';
import { useProfile } from '@/hooks/useProfile';
import { Separator } from '@/components/ui/separator';
import { Camera, X, Send, User, Phone } from 'lucide-react';

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
  const [step, setStep] = useState<'scan' | 'confirm'>('scan');
  const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { processTransfer } = useTransfers();
  const { profile } = useProfile();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const resetForm = () => {
    setStep('scan');
    setScannedUser(null);
    setAmount('');
    setNote('');
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {step === 'scan' ? 'مسح QR كود' : 'تأكيد التحويل'}
          </DialogTitle>
        </DialogHeader>

        {step === 'scan' ? (
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