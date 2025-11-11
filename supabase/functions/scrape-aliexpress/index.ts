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
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Scraping AliExpress URL:", url);

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const html = await response.text();

    // Extract product data using regex patterns
    const extractData = (html: string) => {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch 
        ? titleMatch[1].replace(/\s*-\s*AliExpress.*$/i, "").trim()
        : "";

      // Try multiple patterns for price
      let price = "";
      const pricePatterns = [
        /"minActivityAmount":\{"value":"([0-9.]+)"/,
        /"originalPrice":\{"value":"([0-9.]+)"/,
        /"price":"US \$([0-9.]+)"/,
        /data-spm-anchor-id=".*?">.*?\$([0-9.]+)/,
        /"salePrice":"US \$([0-9.]+)"/
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
        /<meta property="og:image" content="([^"]+)"/,
        /"mainImageUrl":"([^"]+)"/
      ];

      for (const pattern of imagePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          image = match[1].replace(/\\u002F/g, "/");
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

    if (!productData.title && !productData.price) {
      return new Response(
        JSON.stringify({ 
          error: "Could not extract product data. Please enter manually.",
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
