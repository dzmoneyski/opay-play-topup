import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { P2PAd, useP2PActions, getPaymentMethodLabel } from '@/hooks/useP2P';
import { useBalance } from '@/hooks/useBalance';
import { AlertTriangle, Shield } from 'lucide-react';

interface P2PTradeDialogProps {
  ad: P2PAd | null;
  onClose: () => void;
}

export const P2PTradeDialog: React.FC<P2PTradeDialogProps> = ({ ad, onClose }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const { createOrder } = useP2PActions();
  const { balance } = useBalance();

  if (!ad) return null;

  const numAmount = parseFloat(amount) || 0;
  const totalPrice = numAmount * ad.price_per_unit;
  const fee = totalPrice * 0.02;
  const isValid = numAmount >= ad.min_amount && numAmount <= ad.max_amount && paymentMethod;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    const result = await createOrder(ad, numAmount, paymentMethod);
    setLoading(false);
    if (result) {
      onClose();
      setAmount('');
      setPaymentMethod('');
    }
  };

  return (
    <Dialog open={!!ad} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {ad.ad_type === 'sell' ? 'شراء رصيد' : 'بيع رصيد'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Trader info */}
          <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold">
              {(ad.user_name || 'م')[0]}
            </div>
            <div>
              <p className="font-semibold">{ad.user_name}</p>
              <p className="text-xs text-muted-foreground">{ad.trader_profile?.successful_trades || 0} صفقة ناجحة</p>
            </div>
            <Badge variant="secondary" className="mr-auto">
              {ad.price_per_unit.toFixed(2)} د.ج
            </Badge>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>المبلغ (د.ج)</Label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={`${ad.min_amount} - ${ad.max_amount}`}
              min={ad.min_amount}
              max={ad.max_amount}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAmount(String(ad.min_amount))}>
                الحد الأدنى
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setAmount(String(ad.max_amount))}>
                الحد الأقصى
              </Button>
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label>طريقة الدفع</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="اختر طريقة الدفع" />
              </SelectTrigger>
              <SelectContent>
                {ad.payment_methods.map(m => (
                  <SelectItem key={m} value={m}>{getPaymentMethodLabel(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          {numAmount > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المبلغ</span>
                <span className="font-semibold">{numAmount.toLocaleString()} د.ج</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">السعر</span>
                <span>{ad.price_per_unit.toFixed(2)} د.ج</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الرسوم (2%)</span>
                <span>{fee.toFixed(0)} د.ج</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span>الإجمالي</span>
                <span className="text-primary">{(totalPrice + fee).toFixed(0)} د.ج</span>
              </div>
            </div>
          )}

          {/* Escrow notice */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-warning/10 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <span>سيتم حجز المبلغ في نظام الضمان (Escrow) لمدة 30 دقيقة. لن يُحرر إلا بعد تأكيد الدفع.</span>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'جاري الإنشاء...' : `تأكيد ${ad.ad_type === 'sell' ? 'الشراء' : 'البيع'}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
