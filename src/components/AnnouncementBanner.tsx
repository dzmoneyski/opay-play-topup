import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, X, Mail, Phone, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Banner expiry: 2 days from March 14, 2026
const BANNER_EXPIRY = new Date('2026-03-16T23:59:59').getTime();
const DISMISS_KEY = 'announcement_1xbet_dismissed';

const CONTACTS_1XBET = {
  telegram: [
    { label: 'دعم تلغرام', value: 'https://t.me/xBetConsultbot_bot', href: 'https://t.me/xBetConsultbot_bot' },
  ],
  emails: [
    { label: 'استفسارات عامة', value: 'info-en@1xbet-team.com', href: 'mailto:info-en@1xbet-team.com' },
    { label: 'قسم الأمن', value: 'security-en@1xbet-team.com', href: 'mailto:security-en@1xbet-team.com' },
    { label: 'العلاقات العامة والإعلان', value: 'marketing@1xbet-team.com', href: 'mailto:marketing@1xbet-team.com' },
    { label: 'استفسارات الشراكة', value: 'b2b@1xbet-team.com', href: 'mailto:b2b@1xbet-team.com' },
    { label: 'كن وكيلاً', value: 'retail@1xbet-team.com', href: 'mailto:retail@1xbet-team.com' },
  ],
  phones: [
    { label: 'الدعم العالمي', value: '+44 127 325-69-87', href: 'tel:+441273256987' },
    { label: 'الدعم بالفرنسية', value: '+44 204 577-27-77', href: 'tel:+442045772777' },
  ],
};

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
            
            <div className="mt-3 space-y-1.5">
              <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">📞 طرق التواصل مع دعم 1xBet:</p>
              {CONTACTS_1XBET.map((contact, i) => {
                const Icon = contact.icon;
                return (
                  <a
                    key={i}
                    href={contact.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                    <span className="underline-offset-2 hover:underline">{contact.label}</span>
                  </a>
                );
              })}
            </div>

            <a 
              href="https://1xbet.com" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline" className="mt-2 border-yellow-500/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-500/10">
                زيارة موقع 1xBet
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
