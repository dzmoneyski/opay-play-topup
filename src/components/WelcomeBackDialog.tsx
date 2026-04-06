import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Heart, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const ANNOUNCEMENT_KEY = 'welcome_back_1xbet_april_2026';

export function WelcomeBackDialog() {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!user) {
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
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            <CheckCircle2 className="h-9 w-9 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">
            🎉 عدنا للعمل!
          </h2>
          <p className="text-emerald-100 text-sm">
            OpaY × 1xBet
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-right" dir="rtl">
          <p className="text-foreground leading-relaxed text-sm">
            يسعدنا إبلاغكم بأن خدمات الإيداع والسحب عبر منصة
            <span className="font-bold text-primary"> 1xBet </span>
            عادت للعمل بشكل طبيعي.
          </p>

          <p className="text-muted-foreground leading-relaxed text-sm">
            نعتذر عن أي إزعاج سببه التوقف المؤقت. أموالكم كانت وستبقى في أمان تام.
            نشكركم على صبركم وثقتكم بنا.
          </p>

          {/* Trust badges */}
          <div className="flex gap-3 justify-center pt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>أموالكم محمية</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Heart className="h-4 w-4 text-red-500" />
              <span>نقدّر ثقتكم</span>
            </div>
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleAcknowledge}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-base py-6 rounded-xl shadow-lg"
          >
            {submitting ? '...' : '🙏 شكراً'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
