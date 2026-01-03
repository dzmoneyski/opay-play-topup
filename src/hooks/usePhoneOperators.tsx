import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PhoneOperator {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  logo_url: string | null;
  min_amount: number;
  max_amount: number;
  is_active: boolean;
  display_order: number;
}

export const usePhoneOperators = () => {
  const [operators, setOperators] = useState<PhoneOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    try {
      const { data, error } = await supabase
        .from('phone_operators')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setOperators(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { operators, loading, error, refetch: fetchOperators };
};
