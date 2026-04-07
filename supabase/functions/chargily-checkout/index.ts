import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const { amount, payment_method } = await req.json();

    if (!amount || amount < 100) {
      return new Response(
        JSON.stringify({ error: "المبلغ يجب أن يكون 100 دج على الأقل" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["edahabia", "cib"].includes(payment_method)) {
      return new Response(
        JSON.stringify({ error: "طريقة دفع غير مدعومة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const CHARGILY_SECRET_KEY = Deno.env.get("CHARGILY_SECRET_KEY");
    if (!CHARGILY_SECRET_KEY) {
      console.error("CHARGILY_SECRET_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "خطأ في إعدادات بوابة الدفع" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine if test or live mode based on key prefix
    const isTestMode = CHARGILY_SECRET_KEY.startsWith("test_sk_");
    const chargilyBaseUrl = isTestMode
      ? "https://pay.chargily.net/test/api/v2"
      : "https://pay.chargily.net/api/v2";

    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/chargily-webhook`;
    const successUrl = "https://opay-play-topup.lovable.app/deposits?payment=success";
    const failureUrl = "https://opay-play-topup.lovable.app/deposits?payment=failed";

    // Create Chargily checkout
    const chargilyResponse = await fetch(`${chargilyBaseUrl}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CHARGILY_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount,
        currency: "dzd",
        payment_method: payment_method,
        success_url: successUrl,
        failure_url: failureUrl,
        webhook_endpoint: webhookUrl,
        metadata: {
          user_id: userId,
        },
      }),
    });

    if (!chargilyResponse.ok) {
      const errorText = await chargilyResponse.text();
      console.error("Chargily API error:", chargilyResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "فشل في إنشاء عملية الدفع" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const checkout = await chargilyResponse.json();

    // Save to database
    const { error: dbError } = await supabase.from("chargily_payments").insert({
      user_id: userId,
      amount: amount,
      payment_method: payment_method,
      checkout_id: checkout.id,
      checkout_url: checkout.checkout_url,
      status: "pending",
      metadata: { checkout_response: checkout },
    });

    if (dbError) {
      console.error("Database error:", dbError);
    }

    return new Response(
      JSON.stringify({
        checkout_url: checkout.checkout_url,
        checkout_id: checkout.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
