import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CardDeliveryOrder {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  wilaya: string;
  address: string;
  card_amount: number;
  delivery_fee: number;
  total_amount: number;
  status: string;
  payment_status: string;
  delivery_notes?: string;
  admin_notes?: string;
  tracking_number?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export const useCardDeliveryOrders = () => {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["card-delivery-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_delivery_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CardDeliveryOrder[];
    },
  });

  const createOrder = useMutation({
    mutationFn: async (orderData: {
      full_name: string;
      phone: string;
      wilaya: string;
      address: string;
      card_amount: number;
      delivery_fee: number;
      delivery_notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول أولاً");

      const total_amount = orderData.card_amount + orderData.delivery_fee;

      const { data, error } = await supabase
        .from("card_delivery_orders")
        .insert({
          user_id: user.id,
          full_name: orderData.full_name,
          phone: orderData.phone,
          wilaya: orderData.wilaya,
          address: orderData.address,
          card_amount: orderData.card_amount,
          delivery_fee: orderData.delivery_fee,
          total_amount: total_amount,
          delivery_notes: orderData.delivery_notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-delivery-orders"] });
      toast.success("تم إرسال الطلب بنجاح! سنتواصل معك قريباً");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء إرسال الطلب");
    },
  });

  return {
    orders,
    isLoading,
    createOrder: createOrder.mutateAsync,
    isCreating: createOrder.isPending,
  };
};
