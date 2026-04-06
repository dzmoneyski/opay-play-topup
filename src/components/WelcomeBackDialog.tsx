import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Heart, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const ANNOUNCEMENT_KEY = 'welcome_back_1xbet_april_2026';
const ANNOUNCEMENT_EXPIRY = new Date('2026-04-16T23:59:59').getTime(); // 10 days from April 6

export function WelcomeBackDialog() {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!user || Date.now() > ANNOUNCEMENT_EXPIRY) {
      setLoading(false);
      return;
    }

    const checkAcknowledgment = async () => {
      const { data } = await supabase
        .from('announcement_acknowledgments')
        .select('id')
        .eq('user_id', user.id)
        .eq('announcement_key', ANNOUNCEMENT_KEY)
        .maybeSingle();

      if (!data) {
        setOpen(true);
      }
      setLoading(false);
    };

    checkAcknowledgment();
  }, [user]);

  const handleAcknowledge = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      await supabase.from('announcement_acknowledgments').insert({
        user_id: user.id,
        announcement_key: ANNOUNCEMENT_KEY,
      });
      setOpen(false);
    } catch (e) {
      console.error('Failed to acknowledge:', e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md mx-auto p-0 overflow-hidden border-0 rounded-2xl [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-8 text-center">
          <div className="mx-auto w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm ring-4 ring-white/10">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">
            🎉 الخدمة عادت بالكامل!
          </h2>
          <p className="text-emerald-100 text-sm font-medium">
            OpaY × 1xBet
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-right" dir="rtl">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
            <p className="text-foreground leading-relaxed text-sm font-semibold mb-1">
              ✅ خدمات الإيداع والسحب عبر
              <span className="text-emerald-600 dark:text-emerald-400"> 1xBet </span>
              عادت للعمل بشكل كامل وطبيعي.
            </p>
          </div>

          <p className="text-muted-foreground leading-relaxed text-sm">
            نعتذر عن الانقطاع المؤقت الذي حصل في الأيام الماضية. نؤكد لكم أن
            <span className="font-semibold text-foreground"> جميع أموالكم محفوظة وآمنة تماماً</span>.
            يمكنكم الآن استخدام جميع الخدمات بشكل عادي.
          </p>

          <p className="text-muted-foreground leading-relaxed text-sm">
            نشكركم على صبركم وثقتكم الغالية بنا. نحن نعمل دائماً لتقديم أفضل خدمة لكم. 💚
          </p>

          {/* Trust badges */}
          <div className="flex gap-4 justify-center pt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>أموالكم محمية</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Heart className="h-4 w-4 text-red-500" />
              <span>نقدّر ثقتكم</span>
            </div>
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleAcknowledge}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-base py-6 rounded-xl shadow-lg transition-all hover:shadow-xl"
          >
            {submitting ? '...' : '🙏 فهمت، شكراً لكم'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
