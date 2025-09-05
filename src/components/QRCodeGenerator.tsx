import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Download, Share2, User, Phone } from 'lucide-react';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ open, onOpenChange }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const { profile } = useProfile();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open && profile && user) {
      generateQRCode();
    }
  }, [open, profile, user]);

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

  const handleDownload = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.download = `opay-qr-${profile?.full_name || 'user'}.png`;
    link.href = qrCodeUrl;
    link.click();

    toast({
      title: "تم التحميل",
      description: "تم حفظ QR كود في جهازك",
    });
  };

  const handleShare = async () => {
    if (!qrCodeUrl) return;

    try {
      if (navigator.share) {
        // Convert data URL to blob for sharing
        const response = await fetch(qrCodeUrl);
        const blob = await response.blob();
        const file = new File([blob], 'opay-qr.png', { type: 'image/png' });

        await navigator.share({
          title: 'QR كود OpaY الخاص بي',
          text: 'امسح هذا الكود لتحويل الأموال إلي',
          files: [file]
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(qrCodeUrl);
        toast({
          title: "تم النسخ",
          description: "تم نسخ QR كود إلى الحافظة",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ في المشاركة",
        description: "لم نتمكن من مشاركة QR كود",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">QR كود الخاص بك</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              {qrCodeUrl ? (
                <div className="space-y-4">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code"
                    className="mx-auto rounded-lg border"
                    width={200}
                    height={200}
                  />
                  
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center justify-center space-x-2 space-x-reverse mb-2">
                      <User className="h-4 w-4" />
                      <span>{profile?.full_name || 'مستخدم OpaY'}</span>
                    </div>
                    {profile?.phone && (
                      <div className="flex items-center justify-center space-x-2 space-x-reverse">
                        <Phone className="h-4 w-4" />
                        <span>{profile.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <QrCode className="h-16 w-16 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">جاري إنشاء QR كود...</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground">
            <p>اطلب من الآخرين مسح هذا الكود لتحويل الأموال إليك بسرعة</p>
          </div>

          <div className="flex space-x-2 space-x-reverse">
            <Button
              onClick={handleDownload}
              variant="outline"
              className="flex-1"
              disabled={!qrCodeUrl}
            >
              <Download className="h-4 w-4 ml-2" />
              تحميل
            </Button>
            <Button
              onClick={handleShare}
              className="flex-1"
              disabled={!qrCodeUrl}
            >
              <Share2 className="h-4 w-4 ml-2" />
              مشاركة
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};