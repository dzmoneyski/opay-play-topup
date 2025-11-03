import React from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowDownToLine, ArrowUpFromLine, X } from 'lucide-react';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { Button } from '@/components/ui/button';

export function AdminAlertBanner() {
  const { counts } = useAdminNotifications();
  const [dismissed, setDismissed] = React.useState<string[]>([]);

  // Reset dismissed alerts when counts change
  React.useEffect(() => {
    setDismissed([]);
  }, [counts.total]);

  const alerts = [];

  if (counts.pendingVerifications > 0 && !dismissed.includes('verifications')) {
    alerts.push({
      id: 'verifications',
      icon: Shield,
      title: 'طلبات تحقق جديدة',
      description: `لديك ${counts.pendingVerifications} طلب تحقق بانتظار المراجعة`,
      link: '/admin/identity-verification',
      variant: 'default' as const,
    });
  }

  if (counts.pendingDeposits > 0 && !dismissed.includes('deposits')) {
    alerts.push({
      id: 'deposits',
      icon: ArrowDownToLine,
      title: 'عمليات إيداع جديدة',
      description: `لديك ${counts.pendingDeposits} عملية إيداع بانتظار التأكيد`,
      link: '/admin/deposits',
      variant: 'default' as const,
    });
  }

  if (counts.pendingWithdrawals > 0 && !dismissed.includes('withdrawals')) {
    alerts.push({
      id: 'withdrawals',
      icon: ArrowUpFromLine,
      title: 'طلبات سحب جديدة',
      description: `لديك ${counts.pendingWithdrawals} طلب سحب بانتظار المعالجة`,
      link: '/admin/withdrawals',
      variant: 'default' as const,
    });
  }

  const handleDismiss = (alertId: string) => {
    setDismissed([...dismissed, alertId]);
  };

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-6">
      {alerts.map((alert) => {
        const Icon = alert.icon;
        return (
          <Alert key={alert.id} variant={alert.variant} className="relative pr-12 border-l-4 border-l-primary">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-primary/10 mt-0.5">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <AlertDescription className="space-y-2">
                  <div>
                    <h4 className="font-semibold text-base mb-1">{alert.title}</h4>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                  </div>
                  <Link to={alert.link}>
                    <Button size="sm" className="mt-2">
                      عرض الطلبات
                    </Button>
                  </Link>
                </AlertDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-2 h-6 w-6"
                onClick={() => handleDismiss(alert.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Alert>
        );
      })}
    </div>
  );
}
