import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, X, Mail, Phone, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Banner expiry: 2 days from March 14, 2026
const BANNER_EXPIRY = new Date('2026-03-16T23:59:59').getTime();
const DISMISS_KEY = 'announcement_1xbet_dismissed';

const CONTACTS_1XBET = [
  { icon: Mail, label: 'info-en@1xbet-team.com', href: 'mailto:info-en@1xbet-team.com' },
  { icon: Mail, label: 'block-tr@1xbet-team.com (حسابات محظورة)', href: 'mailto:block-tr@1xbet-team.com' },
  { icon: Phone, label: '+441273256987', href: 'tel:+441273256987' },
  { icon: MessageCircle, label: 'تلغرام: 1xBet Casino الرسمي', href: 'https://t.me/casino_1xbet_official' },
  { icon: ExternalLink, label: 'الدردشة المباشرة على الموقع', href: 'https://1xbet.com' },
];

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = React.useState(() => {
    return localStorage.getItem(DISMISS_KEY) === 'true';
  });

  if (dismissed || Date.now() > BANNER_EXPIRY) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="px-4 pt-4">
      <Alert className="relative border-l-4 border-l-yellow-500 bg-yellow-500/10 dark:bg-yellow-500/5">
        <div className="flex items-start gap-3 pr-8">
          <div className="p-1.5 rounded-full bg-yellow-500/20 mt-0.5 shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <AlertDescription className="space-y-2">
            <h4 className="font-bold text-base text-yellow-700 dark:text-yellow-300">
              ⚠️ إشعار هام بخصوص 1xBet
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              نعلمكم أن خدمة الإيداع والسحب عبر 1xBet متوقفة حالياً بسبب قرار من طرف المنصة.
              أموالكم محفوظة في حساباتكم على 1xBet. نرجو منكم التواصل مع دعم 1xBet وطلب إعادة تفعيل خدمة OpaY.
              نعتذر عن هذا الإزعاج ونعمل على حل المشكلة في أقرب وقت.
            </p>
            <a 
              href="https://1xbet.com" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline" className="mt-1 border-yellow-500/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-500/10">
                التواصل مع دعم 1xBet
              </Button>
            </a>
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-2 h-6 w-6 text-yellow-600 dark:text-yellow-400"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    </div>
  );
}
