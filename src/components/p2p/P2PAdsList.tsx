import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useP2PAds, P2PAd, getPaymentMethodLabel } from '@/hooks/useP2P';
import { useAuth } from '@/hooks/useAuth';
import { Star, ShieldCheck, ArrowUpDown, Clock } from 'lucide-react';
import { P2PTradeDialog } from './P2PTradeDialog';

interface P2PAdsListProps {
  adType: 'buy' | 'sell';
}

export const P2PAdsList: React.FC<P2PAdsListProps> = ({ adType }) => {
  const { ads, loading } = useP2PAds(adType);
  const { user } = useAuth();
  const [selectedAd, setSelectedAd] = useState<P2PAd | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (ads.length === 0) {
    return (
      <div className="text-center py-16">
        <ArrowUpDown className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-lg">لا توجد إعلانات حالياً</p>
        <p className="text-sm text-muted-foreground mt-1">كن أول من ينشر إعلان {adType === 'buy' ? 'شراء' : 'بيع'}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {ads.map(ad => (
          <div
            key={ad.id}
            className="bg-card border border-border/50 rounded-xl p-4 hover:shadow-card transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-3">
              {/* Trader info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                  {(ad.user_name || 'م')[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{ad.user_name || 'مستخدم'}</span>
                    {ad.trader_profile?.is_verified_trader && (
                      <ShieldCheck className="h-4 w-4 text-success shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 text-accent fill-accent" />
                      {(ad.trader_profile?.avg_rating || 0).toFixed(1)}
                    </span>
                    <span>•</span>
                    <span>{ad.trader_profile?.successful_trades || 0} صفقة</span>
                    {ad.trader_profile?.avg_release_time ? (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {Math.round((ad.trader_profile.avg_release_time || 0) / 60)} د
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Action */}
              <Button
                size="sm"
                disabled={ad.user_id === user?.id}
                onClick={() => setSelectedAd(ad)}
                className={ad.ad_type === 'sell' 
                  ? 'bg-success hover:bg-success/90 text-success-foreground' 
                  : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                }
              >
                {ad.ad_type === 'sell' ? 'شراء' : 'بيع'}
              </Button>
            </div>

            {/* Price & Amount */}
            <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">السعر</p>
                <p className="font-bold text-foreground">{ad.price_per_unit.toFixed(2)} د.ج</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">المتاح</p>
                <p className="font-semibold">{ad.amount.toLocaleString()} د.ج</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">الحدود</p>
                <p className="text-xs">{ad.min_amount.toLocaleString()} - {ad.max_amount.toLocaleString()}</p>
              </div>
            </div>

            {/* Payment methods */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {ad.payment_methods.map(m => (
                <Badge key={m} variant="secondary" className="text-xs font-normal">
                  {getPaymentMethodLabel(m)}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>

      <P2PTradeDialog
        ad={selectedAd}
        onClose={() => setSelectedAd(null)}
      />
    </>
  );
};
