import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!BOT_TOKEN || !CHAT_ID) {
      console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Telegram config' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const { type, record } = await req.json();

    let message = '';
    const timestamp = new Date().toLocaleString('ar-DZ', { timeZone: 'Africa/Algiers' });

    switch (type) {
      case 'fraud_attempt': {
        const details = record.details || {};
        message = `🚨 *تنبيه احتيال!*\n\n` +
          `📋 النوع: \`${record.attempt_type}\`\n` +
          `👤 المستخدم: \`${record.user_id || 'غير معروف'}\`\n` +
          `📝 التفاصيل: ${details.alert || details.error || JSON.stringify(details)}\n` +
          `🕐 الوقت: ${timestamp}`;
        break;
      }

      case 'new_withdrawal': {
        message = `💸 *طلب سحب جديد*\n\n` +
          `💰 المبلغ: ${record.amount} دج\n` +
          `👤 المستخدم: \`${record.user_id}\`\n` +
          `📋 الطريقة: ${record.withdrawal_method}\n` +
          `🕐 الوقت: ${timestamp}`;
        break;
      }

      case 'new_deposit': {
        message = `📥 *طلب إيداع جديد*\n\n` +
          `💰 المبلغ: ${record.amount} دج\n` +
          `👤 المستخدم: \`${record.user_id}\`\n` +
          `📋 الطريقة: ${record.payment_method}\n` +
          `🕐 الوقت: ${timestamp}`;
        break;
      }

      case 'large_transfer': {
        message = `⚠️ *تحويل كبير!*\n\n` +
          `💰 المبلغ: ${record.amount} دج\n` +
          `📤 المرسل: \`${record.sender_phone}\`\n` +
          `📥 المستقبل: \`${record.recipient_phone}\`\n` +
          `🕐 الوقت: ${timestamp}`;
        break;
      }

      case 'gift_card_redeemed': {
        message = `🎴 *تفعيل بطاقة*\n\n` +
          `💰 المبلغ: ${record.amount} دج\n` +
          `👤 المستخدم: \`${record.user_id}\`\n` +
          `🔢 الكود: \`${record.card_code}\`\n` +
          `🕐 الوقت: ${timestamp}`;
        break;
      }

      default: {
        message = `📢 *تنبيه OpaY*\n\n` +
          `النوع: ${type}\n` +
          `البيانات: ${JSON.stringify(record).substring(0, 500)}\n` +
          `🕐 الوقت: ${timestamp}`;
      }
    }

    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const telegramResult = await telegramResponse.json();

    if (!telegramResult.ok) {
      console.error('Telegram API error:', telegramResult);
      return new Response(
        JSON.stringify({ success: false, error: telegramResult.description }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
