import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { user_ids, admin_secret } = await req.json();

    if (admin_secret !== "opay_admin_ban_2025") {
      return new Response(
        JSON.stringify({ success: false, error: "غير مصرح" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const results = [];

    for (const user_id of user_ids) {
      // Ban for 100 years (effectively permanent)
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: "876600h"
      });

      if (error) {
        console.error(`Error banning user ${user_id}:`, error);
        results.push({ user_id, success: false, error: error.message });
      } else {
        console.log(`User ${user_id} banned successfully`);
        results.push({ user_id, success: true });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
