import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useP2PActions } from '@/hooks/useP2P';
import { Plus } from 'lucide-react';

const PAYMENT_OPTIONS = [
  { id: 'baridimob', label: 'بريدي موب' },
  { id: 'ccp', label: 'CCP' },
  { id: 'payeer', label: 'Payeer' },
  { id: 'redotpay', label: 'RedotPay' },
  { id: 'cash', label: 'كاش (يد بيد)' },
];

interface P2PCreateAdProps {
  onCreated: () => void;
}

export const P2PCreateAd: React.FC<P2PCreateAdProps> = ({ onCreated }) => {
  const [open, setOpen] = useState(false);
  const [adType, setAdType] = useState<'buy' | 'sell'>('sell');
  const [amount, setAmount] = useState('');
  const [minAmount, setMinAmount] = useState('500');
  const [maxAmount, setMaxAmount] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('1');
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [terms, setTerms] = useState('');
  const [loading, setLoading] = useState(false);
  const { createAd } = useP2PActions();

  const togglePayment = (id: string) => {
    setPaymentMethods(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!amount || !maxAmount || paymentMethods.length === 0) return;
    setLoading(true);
    
    const result = await createAd({
      ad_type: adType,
      amount: parseFloat(amount),
      min_amount: parseFloat(minAmount) || 500,
      max_amount: parseFloat(maxAmount),
      price_per_unit: parseFloat(pricePerUnit) || 1,
      payment_methods: paymentMethods,
      terms: terms || undefined,
    });

    setLoading(false);
    if (result) {
      setOpen(false);
      setAmount('');
      setMaxAmount('');
      setPaymentMethods([]);
      setTerms('');
      onCreated();
    }
  };

  const isValid = parseFloat(amount) > 0 && parseFloat(maxAmount) > 0 && paymentMethods.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          نشر إعلان
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>إنشاء إعلان P2P</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setAdType('sell')}
              className={`py-2 rounded-md text-sm font-semibold transition-all ${
                adType === 'sell' 
                  ? 'bg-destructive text-destructive-foreground shadow-sm' 
                  : 'text-muted-foreground'
              }`}
            >
              أريد بيع رصيد
            </button>
            <button
              onClick={() => setAdType('buy')}
              className={`py-2 rounded-md text-sm font-semibold transition-all ${
                adType === 'buy' 
                  ? 'bg-success text-success-foreground shadow-sm' 
                  : 'text-muted-foreground'
              }`}
            >
              أريد شراء رصيد
            </button>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>المبلغ الإجمالي (د.ج)</Label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="مثال: 50000"
            />
          </div>

          {/* Min/Max */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>الحد الأدنى</Label>
              <Input
                type="number"
                value={minAmount}
                onChange={e => setMinAmount(e.target.value)}
                placeholder="500"
              />
            </div>
            <div className="space-y-2">
              <Label>الحد الأقصى</Label>
              <Input
                type="number"
                value={maxAmount}
                onChange={e => setMaxAmount(e.target.value)}
                placeholder="مثال: 10000"
              />
            </div>
          </div>

          {/* Price per unit */}
          <div className="space-y-2">
            <Label>سعر الوحدة (معامل السعر)</Label>
            <Input
              type="number"
              step="0.01"
              value={pricePerUnit}
              onChange={e => setPricePerUnit(e.target.value)}
              placeholder="1.00"
            />
            <p className="text-xs text-muted-foreground">
              1.00 = نفس السعر • 1.02 = هامش 2% • 0.98 = خصم 2%
            </p>
          </div>

          {/* Payment methods */}
          <div className="space-y-2">
            <Label>طرق الدفع المقبولة</Label>
            <div className="space-y-2">
              {PAYMENT_OPTIONS.map(option => (
                <label
                  key={option.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={paymentMethods.includes(option.id)}
                    onCheckedChange={() => togglePayment(option.id)}
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Terms */}
          <div className="space-y-2">
            <Label>شروط التداول (اختياري)</Label>
            <Textarea
              value={terms}
              onChange={e => setTerms(e.target.value)}
              placeholder="مثال: الدفع خلال 15 دقيقة..."
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'جاري النشر...' : 'نشر الإعلان'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
