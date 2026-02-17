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

    const { user_ids, admin_secret } = await req.json();

    if (admin_secret !== "opay_admin_ban_2025") {
      return new Response(
        JSON.stringify({ success: false, error: "غير مصرح" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const results = [];

    for (const user_id of user_ids) {
      // 1. Ban the user (prevents any new token refresh)
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: "876600h"
      });

      // 2. Delete all active sessions via Supabase Auth Admin REST API
      const sessionsResponse = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${user_id}/sessions`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${serviceRoleKey}`,
            "apikey": serviceRoleKey,
            "Content-Type": "application/json",
          },
        }
      );

      const sessionResult = await sessionsResponse.text();
      console.log(`Sessions deleted for ${user_id}:`, sessionsResponse.status, sessionResult);

      results.push({
        user_id,
        banned: !banError,
        sessions_revoked: sessionsResponse.status === 200 || sessionsResponse.status === 204,
        ban_error: banError?.message,
        session_status: sessionsResponse.status,
      });
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
