import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface GamePlatform {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  logo_url: string | null;
  category: 'game' | 'betting';
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface GamePackage {
  id: string;
  platform_id: string;
  name: string;
  name_ar: string;
  price: number;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const useGamePlatforms = () => {
  return useQuery({
    queryKey: ["game-platforms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_platforms")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as GamePlatform[];
    },
  });
};

export const useGamePackages = (platformId: string | null) => {
  return useQuery({
    queryKey: ["game-packages", platformId],
    queryFn: async () => {
      if (!platformId) return [];
      
      const { data, error } = await supabase
        .from("game_packages")
        .select("*")
        .eq("platform_id", platformId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as GamePackage[];
    },
    enabled: !!platformId,
  });
};

export const useCreateGameTopupOrder = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: {
      platform_id: string;
      package_id: string;
      player_id: string;
      amount: number;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("game_topup_orders")
        .insert({
          ...orderData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "تم إرسال الطلب",
        description: "سيتم شحن حسابك خلال دقائق",
      });
      queryClient.invalidateQueries({ queryKey: ["game-topup-orders"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إرسال الطلب",
        variant: "destructive",
      });
    },
  });
};

export const useGameTopupOrders = () => {
  return useQuery({
    queryKey: ["game-topup-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_topup_orders")
        .select(`
          *,
          platform:game_platforms(*),
          package:game_packages(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};
