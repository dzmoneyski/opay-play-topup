import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const CHARGILY_SECRET_KEY = Deno.env.get("CHARGILY_SECRET_KEY");
    if (!CHARGILY_SECRET_KEY) {
      console.error("CHARGILY_SECRET_KEY is not configured");
      return new Response("Server error", { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get("signature");

    // Verify webhook signature
    if (signature) {
      const computedSignature = hmac("sha256", CHARGILY_SECRET_KEY, body, "utf8", "hex");
      if (computedSignature !== signature) {
        console.error("Invalid webhook signature");
        return new Response("Invalid signature", { status: 403 });
      }
    }

    const event = JSON.parse(body);
    console.log("Chargily webhook event:", JSON.stringify(event));

    const checkoutId = event.data?.id || event.id;
    const status = event.data?.status || event.type;

    if (!checkoutId) {
      console.error("No checkout ID in webhook payload");
      return new Response("Missing checkout ID", { status: 400 });
    }

    // Use service role to update payment status
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Map Chargily status to our status
    let paymentStatus = "pending";
    if (status === "paid" || event.type === "checkout.paid") {
      paymentStatus = "paid";
    } else if (status === "failed" || event.type === "checkout.failed") {
      paymentStatus = "failed";
    } else if (status === "expired" || event.type === "checkout.expired") {
      paymentStatus = "expired";
    }

    // Update payment record
    const { data: payment, error: updateError } = await supabaseAdmin
      .from("chargily_payments")
      .update({
        status: paymentStatus,
        processed_at: paymentStatus !== "pending" ? new Date().toISOString() : null,
        metadata: event,
      })
      .eq("checkout_id", checkoutId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating payment:", updateError);
      return new Response("Database error", { status: 500 });
    }

    // If payment is successful, create an approved deposit (triggers balance update automatically)
    if (paymentStatus === "paid" && payment) {
      const { error: depositError } = await supabaseAdmin.from("deposits").insert({
        user_id: payment.user_id,
        amount: payment.amount,
        payment_method: payment.payment_method === "edahabia" ? "edahabiya" : "cib",
        status: "approved",
        transaction_id: checkoutId,
        processed_at: new Date().toISOString(),
        admin_notes: "تم الدفع تلقائياً عبر Chargily Pay",
      });

      if (depositError) {
        console.error("Error creating deposit:", depositError);
      } else {
        console.log(`Deposit created for user ${payment.user_id}: +${payment.amount} DZD`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
