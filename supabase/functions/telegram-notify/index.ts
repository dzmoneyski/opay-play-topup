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
    const CHAT_IDS = [
      Deno.env.get('TELEGRAM_CHAT_ID'),
      Deno.env.get('TELEGRAM_CHAT_ID_2'),
    ].filter(Boolean) as string[];

    if (!BOT_TOKEN || CHAT_IDS.length === 0) {
      console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDs');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Telegram config' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const { type, record } = await req.json();

    let message = '';
    const timestamp = new Date().toLocaleString('ar-DZ', { timeZone: 'Africa/Algiers' });

    switch (type) {
      case 'compromised_card_alert': {
        const status = record.success ? '🔴 نجحت (خطير!)' : '🟢 فشلت (محظورة)';
        message = `🚫🚫🚫 *بطاقة مسروقة!* 🚫🚫🚫\n\n` +
          `⚠️ *تم رصد محاولة استخدام بطاقة من دفعة 6 ديسمبر المسروقة*\n\n` +
          `🔢 كود البطاقة: \`${record.card_code}\`\n` +
          `💰 قيمة البطاقة: ${record.amount} دج\n` +
          `👤 المستخدم: \`${record.user_id}\`\n` +
          `📱 الهاتف: \`${record.user_phone || 'غير معروف'}\`\n` +
          `📊 النتيجة: ${status}\n\n` +
          `📌 *المطلوب:* تواصل مع المستخدم واسأله من أين أحضر هذه البطاقة - قد يكون اشتراها من موزع يبيع بطاقات الوافي المسروقة\n\n` +
          `🕐 الوقت: ${timestamp}`;
        break;
      }

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
        message = `🎴 *تفعيل بطاقة هدية*\n\n` +
          `💰 المبلغ: ${record.amount} دج\n` +
          `👤 المستخدم: \`${record.user_id}\`\n` +
          `📱 الهاتف: \`${record.user_phone || 'غير معروف'}\`\n` +
          `🔢 الكود: \`${record.card_code || 'غير محدد'}\`\n` +
          `✅ الحالة: تم التفعيل بنجاح\n\n` +
          `📌 *يرجى التحقق من مصدر البطاقة*\n` +
          `🕐 الوقت: ${timestamp}`;
        break;
      }


      case 'new_verification': {
        message = `🆔 *طلب تحقق هوية جديد*\n\n` +
          `👤 الاسم: ${record.full_name || 'غير محدد'}\n` +
          `📱 الهاتف: \`${record.phone || 'غير محدد'}\`\n` +
          `🕐 الوقت: ${timestamp}`;
        break;
      }

      case 'new_merchant_request': {
        message = `🏪 *طلب تاجر جديد*\n\n` +
          `🏢 اسم النشاط: ${record.business_name}\n` +
          `📋 نوع النشاط: ${record.business_type}\n` +
          `📱 الهاتف: \`${record.phone}\`\n` +
          `🕐 الوقت: ${timestamp}`;
        break;
      }

      case 'new_game_topup': {
        message = `🎮 *طلب شحن لعبة*\n\n` +
          `💰 المبلغ: ${record.amount} دج\n` +
          `🎯 اللعبة: ${record.platform_name || 'غير محدد'}\n` +
          `🆔 معرف اللاعب: \`${record.player_id}\`\n` +
          `🕐 الوقت: ${timestamp}`;
        break;
      }

      case 'new_betting_deposit': {
        message = `🎰 *طلب إيداع مراهنات*\n\n` +
          `💰 المبلغ: ${record.amount} دج\n` +
          `🎯 المنصة: ${record.platform_name || 'غير محدد'}\n` +
          `🆔 معرف اللاعب: \`${record.player_id}\`\n` +
          `🕐 الوقت: ${timestamp}`;
        break;
      }

      case 'new_betting_withdrawal': {
        message = `🎰 *طلب سحب مراهنات*\n\n` +
          `💰 المبلغ: ${record.amount} دج\n` +
          `🎯 المنصة: ${record.platform_name || 'غير محدد'}\n` +
          `🆔 معرف اللاعب: \`${record.player_id}\`\n` +
          `🔑 كود السحب: \`${record.withdrawal_code}\`\n` +
          `🕐 الوقت: ${timestamp}`;
        break;
      }

      case 'new_digital_card': {
        message = `💳 *طلب بطاقة رقمية*\n\n` +
          `💰 المبلغ: ${record.amount_usd}$ (${record.total_dzd} دج)\n` +
          `📋 النوع: ${record.card_type || 'غير محدد'}\n` +
          `🆔 الحساب: \`${record.account_id}\`\n` +
          `🕐 الوقت: ${timestamp}`;
        break;
      }

      case 'new_phone_topup': {
        message = `📱 *طلب شحن هاتف*\n\n` +
          `💰 المبلغ: ${record.amount} دج\n` +
          `📞 الرقم: \`${record.phone_number}\`\n` +
          `📡 المشغل: ${record.operator_name || 'غير محدد'}\n` +
          `🕐 الوقت: ${timestamp}`;
        break;
      }

      case 'new_transfer': {
        message = `💸 *تحويل جديد*\n\n` +
          `💰 المبلغ: ${record.amount} دج\n` +
          `📤 المرسل: \`${record.sender_phone}\`\n` +
          `📥 المستقبل: \`${record.recipient_phone}\`\n` +
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

    // Send to all Telegram admins
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const results = await Promise.allSettled(
      CHAT_IDS.map(chatId =>
        fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
          }),
        }).then(r => r.json())
      )
    );

    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
    if (failed.length === CHAT_IDS.length) {
      console.error('All Telegram sends failed:', failed);
      return new Response(
        JSON.stringify({ success: false, error: 'All Telegram sends failed' }),
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
