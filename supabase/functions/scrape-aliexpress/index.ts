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
      console.log('SCRAPER_API_KEY not configured, using direct fetch');
    }

    let html: string;
    
    if (scraperApiKey && scraperApiKey.length > 10) {
      // Use ScraperAPI with premium settings
      const scraperParams = new URLSearchParams({
        api_key: scraperApiKey,
        url: url,
        render: 'true',
        country_code: 'us', // Use US instead of DZ for better compatibility
        premium: 'true',
        session_number: '123', // Keep session for consistency
      });
      
      const scraperUrl = `http://api.scraperapi.com?${scraperParams.toString()}`;
      
      console.log('Using ScraperAPI with premium settings...');
      
      try {
        const response = await fetch(scraperUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('ScraperAPI error:', response.status, errorText);
          throw new Error(`ScraperAPI failed: ${response.status} - ${errorText}`);
        }

        html = await response.text();
        console.log('Successfully fetched HTML via ScraperAPI, length:', html.length);
      } catch (error) {
        console.error('ScraperAPI request failed:', error);
        throw error;
      }
    } else {
      // Fallback to direct fetch with better headers
      console.log('Using direct fetch with enhanced headers...');
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0',
        },
      });

      if (!response.ok) {
        throw new Error(`Direct fetch failed: ${response.status}`);
      }

      html = await response.text();
      console.log('Successfully fetched HTML directly, length:', html.length);
    }

    // استخراج البيانات من HTML
    console.log('Starting data extraction...');
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

    console.log('Extracted product data:', JSON.stringify(productData, null, 2));
    
    // تحذير إذا لم يتم العثور على السعر
    if (productData.price === 0) {
      console.warn('WARNING: Price extraction failed! Price is 0');
      // محاولة استخراج السعر من URL كـ fallback
      const urlPriceMatch = url.match(/USD[^0-9]*([0-9.]+)/);
      if (urlPriceMatch) {
        const urlPrice = parseFloat(urlPriceMatch[1]);
        if (!isNaN(urlPrice) && urlPrice > 0) {
          console.log(`Found price in URL: $${urlPrice}`);
          productData.price = urlPrice;
        }
      }
    }

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
  console.log('Extracting price from HTML...');
  
  // محاولة استخراج من window.runParams أو الـ JSON data
  const jsonPatterns = [
    /window\.runParams\s*=\s*({[^;]+});/,
    /data:\s*({[^}]*"price"[^}]*})/,
    /"priceModule":\s*({[^}]+})/,
  ];

  for (const jsonPattern of jsonPatterns) {
    const jsonMatch = html.match(jsonPattern);
    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1];
        console.log('Found JSON data, searching for price...');
        
        // البحث عن السعر في النص JSON
        const priceMatches = [
          /"actMinPrice":"?([0-9.]+)"?/,
          /"minPrice":"?([0-9.]+)"?/,
          /"salePrice"[^}]*"min":"?([0-9.]+)"?/,
          /"price":"?([0-9.]+)"?/,
          /"minActivityAmount":\s*{\s*"value":\s*"?([0-9.]+)"?/,
        ];
        
        for (const pricePattern of priceMatches) {
          const priceMatch = jsonStr.match(pricePattern);
          if (priceMatch) {
            const price = parseFloat(priceMatch[1]);
            if (!isNaN(price) && price > 0) {
              console.log(`Found price: $${price}`);
              return price;
            }
          }
        }
      } catch (e) {
        console.log('JSON parse error:', e);
      }
    }
  }

  // Fallback: البحث المباشر في HTML
  const directPatterns = [
    /"actMinPrice":"([0-9.]+)"/,
    /"minPrice":"([0-9.]+)"/,
    /"price":"([0-9.]+)"/,
    /"salePrice":\s*"([0-9.]+)"/,
    /data-spm-anchor-id="[^"]*product_price[^"]*"[^>]*>\$?([0-9.]+)/i,
    /<span[^>]*price[^>]*>\$?([0-9.]+)<\/span>/i,
  ];

  console.log('Trying direct pattern matching...');
  for (const pattern of directPatterns) {
    const match = html.match(pattern);
    if (match) {
      const price = parseFloat(match[1]);
      if (!isNaN(price) && price > 0) {
        console.log(`Found price via direct pattern: $${price}`);
        return price;
      }
    }
  }

  console.log('No price found');
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
  console.log('Extracting shipping cost from HTML...');
  
  // محاولة استخراج من JSON data
  const jsonPatterns = [
    /"shippingModule":\s*({[^}]+})/,
    /"freightExt":\s*({[^}]+})/,
    /"freight":\s*({[^}]+})/,
  ];

  for (const jsonPattern of jsonPatterns) {
    const jsonMatch = html.match(jsonPattern);
    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1];
        console.log('Found shipping JSON data...');
        
        const shippingPatterns = [
          /"shippingFee":"?([0-9.]+)"?/,
          /"freight":"?([0-9.]+)"?/,
          /"freightAmount":"?([0-9.]+)"?/,
          /"value":"?([0-9.]+)"?/,
        ];
        
        for (const pattern of shippingPatterns) {
          const match = jsonStr.match(pattern);
          if (match) {
            const cost = parseFloat(match[1]);
            if (!isNaN(cost)) {
              console.log(`Found shipping cost: $${cost}`);
              return cost;
            }
          }
        }
      } catch (e) {
        console.log('Shipping JSON parse error:', e);
      }
    }
  }

  // Fallback: البحث المباشر
  const directPatterns = [
    /"shippingFee":"([0-9.]+)"/,
    /"freight":"([0-9.]+)"/,
    /"deliveryFee":"([0-9.]+)"/,
    /"freightAmount":"([0-9.]+)"/,
    /shipping[^>]*>\$?([0-9.]+)/i,
    /delivery[^>]*>\$?([0-9.]+)/i,
  ];

  for (const pattern of directPatterns) {
    const match = html.match(pattern);
    if (match) {
      const cost = parseFloat(match[1]);
      if (!isNaN(cost)) {
        console.log(`Found shipping cost via direct pattern: $${cost}`);
        return cost;
      }
    }
  }

  // التحقق من الشحن المجاني
  const freeShippingPatterns = [
    /free\s*shipping/i,
    /livraison\s*gratuite/i,
    /"freightFree":\s*true/i,
    /"isFreeShipping":\s*true/i,
  ];

  for (const pattern of freeShippingPatterns) {
    if (pattern.test(html)) {
      console.log('Free shipping detected');
      return 0;
    }
  }

  console.log('No shipping cost found');
  return null;
}
