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

      // Get all transfers where user is sender or recipient
      const { data: transfers, error: transferError } = await supabase
        .from('transfers')
        .select(`
          sender_id,
          recipient_id,
          sender:profiles!transfers_sender_id_fkey(full_name, phone),
          recipient:profiles!transfers_recipient_id_fkey(full_name, phone)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (transferError) {
        console.error('Error fetching contacts:', transferError);
        setLoading(false);
        return;
      }

      // Extract unique contacts (exclude current user)
      const contactsMap = new Map<string, Contact>();
      
      transfers?.forEach(transfer => {
        // If current user is sender, add recipient as contact
        if (transfer.sender_id === user.id && transfer.recipient) {
          const recipient = transfer.recipient as any;
          if (recipient.phone && !contactsMap.has(recipient.phone)) {
            contactsMap.set(recipient.phone, {
              name: recipient.full_name || 'مستخدم',
              phone: recipient.phone,
              avatar: recipient.full_name ? recipient.full_name.charAt(0).toUpperCase() : 'M'
            });
          }
        }
        
        // If current user is recipient, add sender as contact
        if (transfer.recipient_id === user.id && transfer.sender) {
          const sender = transfer.sender as any;
          if (sender.phone && !contactsMap.has(sender.phone)) {
            contactsMap.set(sender.phone, {
              name: sender.full_name || 'مستخدم',
              phone: sender.phone,
              avatar: sender.full_name ? sender.full_name.charAt(0).toUpperCase() : 'M'
            });
          }
        }
      });

      // Convert map to array and limit to 4 most recent unique contacts
      const formattedContacts = Array.from(contactsMap.values()).slice(0, 4);
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