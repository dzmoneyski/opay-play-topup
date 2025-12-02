import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import BackButton from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Share2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function ShareApp() {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // رابط الموقع الرسمي
  const appUrl = 'https://opaydz.com';

  useEffect(() => {
    generateQRCode();
  }, []);

  const generateQRCode = async () => {
    try {
      const url = await QRCode.toDataURL(appUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#1e3a5f',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('فشل في إنشاء QR Code');
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.download = 'opay-qr-code.png';
    link.href = qrCodeUrl;
    link.click();
    toast.success('تم تحميل QR Code بنجاح');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      toast.success('تم نسخ الرابط');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('فشل في نسخ الرابط');
    }
  };

  const shareApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'OPay - محفظة رقمية',
          text: 'جرب تطبيق OPay للمحفظة الرقمية',
          url: appUrl
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      copyLink();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton />
        </div>
        
        <div className="max-w-md mx-auto">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-white">
                مشاركة التطبيق
              </CardTitle>
              <p className="text-white/70 text-sm">
                شارك هذا الكود مع أي شخص للوصول للتطبيق
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* QR Code Display */}
              <div className="bg-white rounded-2xl p-6 flex items-center justify-center">
                {qrCodeUrl ? (
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code للتطبيق" 
                    className="w-64 h-64 rounded-2xl"
                  />
                ) : (
                  <div className="w-64 h-64 bg-gray-100 animate-pulse rounded-lg" />
                )}
              </div>

              {/* App URL */}
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-white/50 text-xs mb-1">رابط التطبيق</p>
                <p className="text-white text-sm font-mono break-all">{appUrl}</p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={downloadQRCode}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="w-4 h-4 ml-2" />
                  تحميل الصورة
                </Button>
                
                <Button 
                  onClick={copyLink}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  {copied ? (
                    <Check className="w-4 h-4 ml-2" />
                  ) : (
                    <Copy className="w-4 h-4 ml-2" />
                  )}
                  نسخ الرابط
                </Button>
              </div>

              <Button 
                onClick={shareApp}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Share2 className="w-4 h-4 ml-2" />
                مشاركة التطبيق
              </Button>

              <p className="text-white/50 text-xs text-center">
                امسح هذا الكود بكاميرا هاتفك للوصول مباشرة للتطبيق
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
