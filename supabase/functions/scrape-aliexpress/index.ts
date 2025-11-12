import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url: rawUrl } = await req.json();

    if (!rawUrl) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract URL from text if user copied the entire share message
    let url = rawUrl.trim();
    const urlMatch = url.match(/(https?:\/\/(?:www\.|m\.)?a?\.?aliexpress\.(?:com|us)\/[^\s]+)/i);
    if (urlMatch) {
      url = urlMatch[1];
      console.log("Extracted URL from text:", url);
    }

    console.log("Scraping AliExpress URL:", url);

    // Follow redirects for shortened URLs and fetch the page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Cache-Control": "max-age=0",
      },
      redirect: "follow", // Follow redirects automatically
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const finalUrl = response.url; // Get the final URL after redirects
    console.log("Final URL after redirects:", finalUrl);

    // Check if redirected to error page
    if (finalUrl.includes('/error/') || finalUrl.includes('404.html')) {
      return new Response(
        JSON.stringify({ 
          error: "الرابط غير صحيح أو المنتج غير موجود. يرجى التحقق من الرابط أو إدخال البيانات يدوياً."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = await response.text();

    // Extract product data using regex patterns
    const extractData = (html: string) => {
      // Extract title - try multiple patterns
      let title = "";
      const titlePatterns = [
        /<title[^>]*>([^<]+)<\/title>/i,
        /<h1[^>]*class="[^"]*product-title[^"]*"[^>]*>([^<]+)<\/h1>/i,
        /"title":"([^"]+)"/,
        /"productTitle":"([^"]+)"/,
        /<meta property="og:title" content="([^"]+)"/,
      ];

      for (const pattern of titlePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          title = match[1]
            .replace(/\s*-\s*AliExpress.*$/i, "")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, "&")
            .trim();
          if (title && title !== "404 page" && title !== "AliExpress") {
            break;
          }
        }
      }

      // Try multiple patterns for price
      let price = "";
      const pricePatterns = [
        /"minActivityAmount":\{"value":"?([0-9.]+)"?\}/,
        /"actMinPrice":"?([0-9.]+)"?/,
        /"originalPrice":\{"value":"?([0-9.]+)"?\}/,
        /"price":"?US \$([0-9.]+)"?/,
        /"salePrice":\{"min":"?([0-9.]+)"?\}/,
        /"baseSalePrice":"?([0-9.]+)"?/,
        /window\.runParams\s*=\s*\{[^}]*"actMinPrice":"?([0-9.]+)"?/,
        /data-spm-anchor-id="[^"]*"[^>]*>\$([0-9.]+)/,
        /"formatedActivityPrice":"US \$([0-9.]+)"/,
      ];

      for (const pattern of pricePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          price = match[1];
          break;
        }
      }

      // Try multiple patterns for image
      let image = "";
      const imagePatterns = [
        /"imageUrl":"([^"]+)"/,
        /"imageBigViewURL":\["([^"]+)"\]/,
        /<meta property="og:image" content="([^"]+)"/,
        /"mainImageUrl":"([^"]+)"/,
        /"imagePathList":\["([^"]+)"\]/,
        /window\.runParams\s*=\s*\{[^}]*"imageUrl":"([^"]+)"/,
      ];

      for (const pattern of imagePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          image = match[1]
            .replace(/\\u002F/g, "/")
            .replace(/\\/g, "");
          if (image.startsWith("//")) {
            image = "https:" + image;
          }
          break;
        }
      }

      return {
        title,
        price: price ? parseFloat(price) : null,
        image: image || null,
      };
    };

    const productData = extractData(html);

    console.log("Extracted data:", productData);

    // Check if we got a 404 title or no data
    if (!productData.title || productData.title === "404 page" || productData.title === "AliExpress" || 
        (!productData.price && !productData.image)) {
      return new Response(
        JSON.stringify({ 
          error: "لم نتمكن من استخراج البيانات. يرجى التأكد من صحة الرابط أو إدخال البيانات يدوياً.",
          partialData: productData 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: productData 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error scraping AliExpress:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
