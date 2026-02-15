import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyP2PAds, useP2PActions, getPaymentMethodLabel } from '@/hooks/useP2P';
import { Trash2, Megaphone } from 'lucide-react';

export const P2PMyAds: React.FC = () => {
  const { ads, loading, refetch } = useMyP2PAds();
  const { toggleAd, deleteAd } = useP2PActions();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  if (ads.length === 0) {
    return (
      <div className="text-center py-16">
        <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-lg">لا توجد إعلانات</p>
        <p className="text-sm text-muted-foreground mt-1">أنشئ إعلان جديد للبدء</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {ads.map(ad => (
        <div key={ad.id} className="bg-card border border-border/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={ad.ad_type === 'sell' ? 'destructive' : 'default'}>
                {ad.ad_type === 'sell' ? 'بيع' : 'شراء'}
              </Badge>
              <span className="font-bold">{ad.amount.toLocaleString()} د.ج</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={ad.is_active}
                onCheckedChange={async (checked) => {
                  await toggleAd(ad.id, checked);
                  refetch();
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive h-8 w-8"
                onClick={async () => {
                  await deleteAd(ad.id);
                  refetch();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
            <span>السعر: {ad.price_per_unit.toFixed(2)}</span>
            <span>الحدود: {ad.min_amount}-{ad.max_amount}</span>
            <span>{ad.completed_trades} صفقة</span>
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            {ad.payment_methods.map(m => (
              <Badge key={m} variant="outline" className="text-[10px]">
                {getPaymentMethodLabel(m)}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
