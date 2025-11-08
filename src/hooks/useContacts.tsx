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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Get current user's profile to get their phone
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentUserPhone = currentProfile?.phone;

      // Get all transfers where user is sender or recipient
      const { data: transfers, error: transferError } = await supabase
        .from('transfers')
        .select('sender_id, recipient_id, sender_phone, recipient_phone, created_at')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (transferError) {
        console.error('Error fetching contacts:', transferError);
        setLoading(false);
        return;
      }

      // Extract unique phone numbers (exclude current user)
      const contactPhones = new Set<string>();
      
      transfers?.forEach(transfer => {
        // If current user is sender, add recipient phone
        if (transfer.sender_id === user.id && transfer.recipient_phone) {
          if (transfer.recipient_phone !== currentUserPhone) {
            contactPhones.add(transfer.recipient_phone);
          }
        }
        
        // If current user is recipient, add sender phone
        if (transfer.recipient_id === user.id && transfer.sender_phone) {
          if (transfer.sender_phone !== currentUserPhone) {
            contactPhones.add(transfer.sender_phone);
          }
        }
      });

      // Get profiles for these phone numbers
      if (contactPhones.size === 0) {
        setContacts([]);
        setLoading(false);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .in('phone', Array.from(contactPhones))
        .limit(4);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setLoading(false);
        return;
      }

      const formattedContacts: Contact[] = (profiles || []).map(profile => ({
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