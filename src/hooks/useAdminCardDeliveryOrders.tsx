import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CardDeliveryOrder } from "./useCardDeliveryOrders";

export const useAdminCardDeliveryOrders = () => {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-card-delivery-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_delivery_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CardDeliveryOrder[];
    },
  });

  const updateOrder = useMutation({
    mutationFn: async ({
      orderId,
      updates,
    }: {
      orderId: string;
      updates: Partial<CardDeliveryOrder>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول أولاً");

      const { data, error } = await supabase
        .from("card_delivery_orders")
        .update({
          ...updates,
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-card-delivery-orders"] });
      toast.success("تم تحديث الطلب بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث الطلب");
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("card_delivery_orders")
        .delete()
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-card-delivery-orders"] });
      toast.success("تم حذف الطلب بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء حذف الطلب");
    },
  });

  return {
    orders,
    isLoading,
    updateOrder: updateOrder.mutateAsync,
    deleteOrder: deleteOrder.mutateAsync,
    isUpdating: updateOrder.isPending,
    isDeleting: deleteOrder.isPending,
  };
};
