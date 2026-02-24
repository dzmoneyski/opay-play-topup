import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sendTelegramNotification } from '@/lib/telegramNotify';

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

export interface GameTopupOrder {
  id: string;
  user_id: string;
  platform_id: string;
  package_id: string;
  player_id: string;
  amount: number;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  proof_image_url: string | null;
  processed_at: string | null;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
  platform?: GamePlatform;
  package?: GamePackage;
  user?: {
    user_id: string;
    full_name: string | null;
    phone: string | null;
    email: string | null;
  };
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
      const { data, error } = await supabase.rpc('process_game_topup_order', {
        _platform_id: orderData.platform_id,
        _package_id: orderData.package_id,
        _player_id: orderData.player_id,
        _amount: orderData.amount,
        _notes: orderData.notes || null
      });

      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (data: any, variables) => {
      toast({
        title: "تم خصم المبلغ وإرسال الطلب",
        description: data.message || "سيتم مراجعة طلبك من قبل المشرف",
      });

      // Send Telegram notification
      sendTelegramNotification('new_game_topup', {
        amount: variables.amount,
        player_id: variables.player_id,
        platform_name: variables.platform_id
      });

      queryClient.invalidateQueries({ queryKey: ["game-topup-orders"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
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
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error("المستخدم غير مسجل الدخول");
      }

      // Fetch only the current user's orders
      const { data, error } = await supabase
        .from("game_topup_orders")
        .select(`
          *,
          platform:game_platforms(*),
          package:game_packages(*)
        `)
        .eq('user_id', user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useAdminGameTopupOrders = () => {
  return useQuery<GameTopupOrder[]>({
    queryKey: ["admin-game-topup-orders"],
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
      
      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(order => order.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone, email")
          .in("user_id", userIds);
        
        // Map profiles to orders
        return data.map(order => ({
          ...order,
          user: profiles?.find(p => p.user_id === order.user_id)
        })) as GameTopupOrder[];
      }
      
      return data as GameTopupOrder[];
    },
  });
};

export const useApproveGameTopupOrder = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, adminNotes, proofImageUrl }: { orderId: string; adminNotes?: string; proofImageUrl?: string }) => {
      // Update order with proof image URL first
      if (proofImageUrl) {
        const { error: updateError } = await supabase
          .from('game_topup_orders')
          .update({ proof_image_url: proofImageUrl })
          .eq('id', orderId);
        
        if (updateError) throw updateError;
      }

      const { data, error } = await supabase.rpc('approve_game_topup_order', {
        _order_id: orderId,
        _admin_notes: adminNotes || null
      });

      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (data: any) => {
      toast({
        title: "تم الموافقة على الطلب",
        description: data.message || "تم شحن حساب اللاعب بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-game-topup-orders"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء الموافقة",
        variant: "destructive",
      });
    },
  });
};

export const useRejectGameTopupOrder = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, adminNotes }: { orderId: string; adminNotes: string }) => {
      const { data, error } = await supabase.rpc('reject_game_topup_order', {
        _order_id: orderId,
        _admin_notes: adminNotes || null
      });

      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (data: any) => {
      toast({
        title: "تم رفض الطلب",
        description: data.message || "تم إرجاع المبلغ للمستخدم",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-game-topup-orders"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء الرفض",
        variant: "destructive",
      });
    },
  });
};
