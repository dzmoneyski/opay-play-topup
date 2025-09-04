import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Contact {
  name: string;
  phone: string;
  avatar: string;
}

export const useContacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .not('phone', 'is', null)
        .not('full_name', 'is', null)
        .limit(4);

      if (error) {
        console.error('Error fetching contacts:', error);
        return;
      }

      const formattedContacts: Contact[] = (data || []).map(profile => ({
        name: profile.full_name || 'مستخدم',
        phone: profile.phone || '',
        avatar: profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'M'
      }));

      setContacts(formattedContacts);
    } catch (error) {
      console.error('Unexpected error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  return {
    contacts,
    loading,
    refetchContacts: fetchContacts
  };
};