import { FeeConfig } from '@/hooks/useFeeSettings';

export interface FeeCalculation {
  fee_amount: number;
  net_amount: number;
  fee_percentage: number;
  fee_fixed: number;
  original_amount: number;
}

export const calculateFee = (amount: number, feeConfig: FeeConfig | null): FeeCalculation => {
  if (!feeConfig || !feeConfig.enabled || amount <= 0) {
    return {
      fee_amount: 0,
      net_amount: amount,
      fee_percentage: 0,
      fee_fixed: 0,
      original_amount: amount
    };
  }

  const { percentage = 0, fixed_amount = 0, min_fee = 0, max_fee = 999999 } = feeConfig;
  
  // حساب الرسوم: نسبة مئوية + مبلغ ثابت
  let calculatedFee = (amount * percentage / 100) + fixed_amount;
  
  // تطبيق الحد الأدنى والأقصى
  calculatedFee = Math.max(calculatedFee, min_fee);
  calculatedFee = Math.min(calculatedFee, max_fee);
  
  return {
    fee_amount: calculatedFee,
    net_amount: amount - calculatedFee,
    fee_percentage: percentage,
    fee_fixed: fixed_amount,
    original_amount: amount
  };
};

export const formatCurrency = (amount: number): string => {
  return amount.toFixed(2);
};