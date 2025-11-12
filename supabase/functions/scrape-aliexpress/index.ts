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
    const { url } = await req.json();

    if (!url || !url.includes('aliexpress.com')) {
      return new Response(
        JSON.stringify({ error: 'Invalid AliExpress URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching AliExpress product:', url);

    // Get ScraperAPI key from environment
    const scraperApiKey = Deno.env.get('SCRAPER_API_KEY');
    
    if (!scraperApiKey) {
      throw new Error('SCRAPER_API_KEY not configured');
    }

    // Use ScraperAPI to fetch the page with JavaScript rendering
    const scraperUrl = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(url)}&render=true&country_code=dz`;
    
    console.log('Using ScraperAPI to fetch product data...');
    
    const response = await fetch(scraperUrl);

    if (!response.ok) {
      throw new Error(`ScraperAPI failed: ${response.status}`);
    }

    const html = await response.text();

    // استخراج البيانات من HTML
    const productData = {
      title: extractTitle(html),
      price: extractPrice(html),
      originalPrice: extractOriginalPrice(html),
      images: extractImages(html),
      rating: extractRating(html),
      orders: extractOrders(html),
      description: extractDescription(html),
      shippingCost: extractShippingCost(html),
    };

    console.log('Extracted product data:', productData);

    return new Response(
      JSON.stringify(productData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error scraping AliExpress:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to scrape product data',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractTitle(html: string): string {
  const patterns = [
    /<h1[^>]*class="[^"]*product-title[^"]*"[^>]*>([^<]+)<\/h1>/i,
    /<title>([^<]+)<\/title>/i,
    /"subject":"([^"]+)"/,
    /"title":"([^"]+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1].trim().replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    }
  }
  return 'منتج من AliExpress';
}

function extractPrice(html: string): number {
  const patterns = [
    /"price":"([0-9.]+)"/,
    /"actMinPrice":"([0-9.]+)"/,
    /"salePrice":{[^}]*"min":([0-9.]+)/,
    /data-spm-anchor-id="[^"]*">\$([0-9.]+)</,
    /"minPrice":"([0-9.]+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const price = parseFloat(match[1]);
      if (!isNaN(price) && price > 0) {
        return price;
      }
    }
  }
  return 0;
}

function extractOriginalPrice(html: string): number | null {
  const patterns = [
    /"originalPrice":"([0-9.]+)"/,
    /"actMaxPrice":"([0-9.]+)"/,
    /"maxPrice":"([0-9.]+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const price = parseFloat(match[1]);
      if (!isNaN(price) && price > 0) {
        return price;
      }
    }
  }
  return null;
}

function extractImages(html: string): string[] {
  const images: string[] = [];
  
  // البحث عن الصور في JSON data
  const imagePatterns = [
    /"imagePathList":\[(.*?)\]/,
    /"imageBigViewURL":\[(.*?)\]/,
    /"images":\[(.*?)\]/,
  ];

  for (const pattern of imagePatterns) {
    const match = html.match(pattern);
    if (match) {
      const urls = match[1].match(/"(https?:\/\/[^"]+)"/g);
      if (urls) {
        urls.forEach(url => {
          const cleanUrl = url.replace(/"/g, '');
          if (!images.includes(cleanUrl)) {
            images.push(cleanUrl);
          }
        });
      }
    }
  }

  return images.slice(0, 5); // أول 5 صور فقط
}

function extractRating(html: string): number {
  const patterns = [
    /"averageStar":"([0-9.]+)"/,
    /"rating":([0-9.]+)/,
    /"starRating":"([0-9.]+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const rating = parseFloat(match[1]);
      if (!isNaN(rating)) {
        return rating;
      }
    }
  }
  return 0;
}

function extractOrders(html: string): string {
  const patterns = [
    /"tradeCount":"([^"]+)"/,
    /"totalSold":"([^"]+)"/,
    /"sales":"([^"]+)"/,
    /([0-9]+(?:\.[0-9]+)?[K|k]?)\+?\s*orders?/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return '0';
}

function extractDescription(html: string): string {
  const patterns = [
    /"description":"([^"]+)"/,
    /<meta name="description" content="([^"]+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1].substring(0, 200);
    }
  }
  return '';
}

function extractShippingCost(html: string): number | null {
  const patterns = [
    /"shippingFee":"([0-9.]+)"/,
    /"freight":"([0-9.]+)"/,
    /"deliveryFee":"([0-9.]+)"/,
    /"logisticsCost":"([0-9.]+)"/,
    /"freightAmount":"([0-9.]+)"/,
    /Shipping:\s*\$([0-9.]+)/i,
    /Delivery:\s*\$([0-9.]+)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const cost = parseFloat(match[1]);
      if (!isNaN(cost)) {
        return cost;
      }
    }
  }

  // التحقق من الشحن المجاني
  if (/free\s*shipping/i.test(html)) {
    return 0;
  }

  return null;
}
