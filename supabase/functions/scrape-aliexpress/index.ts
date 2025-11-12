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

    // استخراج المعرف ومحاولة جلب الشحن عبر API رسمي
    const productId = getProductId(url, html);
    let shippingFromApi: number | null = null;
    if (productId) {
      try {
        shippingFromApi = await fetchShippingDZ(productId, url, scraperApiKey || undefined);
      } catch (e) {
        console.log('Freight API fetch failed, will fallback to HTML extraction.', e);
      }
    } else {
      console.warn('Could not determine productId; skipping freight API.');
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
      shippingCost: shippingFromApi ?? extractShippingCost(html),
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

  // 0) Strongest signal: JSON-LD offers
  try {
    const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m: RegExpExecArray | null;
    while ((m = jsonLdRegex.exec(html)) !== null) {
      const block = m[1].trim();
      try {
        const data = JSON.parse(block);
        // JSON-LD might be an array or object
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item && (item['@type'] === 'Product' || item.offers)) {
            const offers = item.offers;
            const offersArr = Array.isArray(offers) ? offers : [offers];
            for (const offer of offersArr) {
              const priceStr = offer?.price ?? offer?.lowPrice ?? offer?.highPrice;
              const currency = offer?.priceCurrency || item?.priceCurrency;
              if (priceStr && !isNaN(parseFloat(String(priceStr)))) {
                const val = parseFloat(String(priceStr));
                if (val > 0) {
                  console.log('Price from JSON-LD offers:', val, currency ? `(${currency})` : '');
                  return val;
                }
              }
            }
          }
        }
      } catch (_) {
        // ignore JSON parse errors of unrelated blocks
      }
    }
  } catch (_) {}

  // 1) Next: priceModule from window.runParams (prefer activity/discounted values)
  const priceModuleMatch = html.match(/"priceModule"\s*:\s*({[\s\S]*?})/);
  if (priceModuleMatch) {
    const jsonStr = priceModuleMatch[1];
    const prioritized = [
      /"formatedActivityPrice"\s*:\s*"[^0-9]*([0-9.]+)"/, // $1.66
      /"minActivityAmount"\s*:\s*\{[^}]*"value"\s*:\s*"?([0-9.]+)"?/, // 1.66
      /"actMinPrice"\s*:\s*"?([0-9.]+)"?/, // 1.66
      /"salePrice"[^}]*"min"\s*:\s*"?([0-9.]+)"?/, // 1.66
      /"minPrice"\s*:\s*"?([0-9.]+)"?/, // 1.66
      /"price"\s*:\s*"?([0-9.]+)"?/, // 1.66
    ];
    for (const re of prioritized) {
      const m = jsonStr.match(re);
      if (m) {
        const v = parseFloat(m[1]);
        if (!isNaN(v) && v > 0) {
          console.log('Price from priceModule (prioritized):', v);
          return v;
        }
      }
    }
  }

  // 2) Meta OpenGraph price
  const ogPrice = html.match(/<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([0-9.]+)["'][^>]*>/i);
  if (ogPrice) {
    const v = parseFloat(ogPrice[1]);
    if (!isNaN(v) && v > 0) {
      console.log('Price from og:price:amount:', v);
      return v;
    }
  }

  // 3) Last-resort: direct patterns (non-greedy)
  const directPatterns = [
    /data-activity-price\s*=\s*"?([0-9.]+)"?/,
    /data-price\s*=\s*"?([0-9.]+)"?/,
    /\$\s*([0-9]+(?:\.[0-9]{1,2})?)/,
    /"actMinPrice":"([0-9.]+)"/,
    /"minPrice":"([0-9.]+)"/,
  ];
  for (const re of directPatterns) {
    const m = html.match(re);
    if (m) {
      const v = parseFloat(m[1]);
      if (!isNaN(v) && v > 0) {
        console.log('Price from direct pattern:', v);
        return v;
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

function getProductId(url: string, html: string): string | null {
  const urlMatch = url.match(/item\/(\d+)\.html/);
  if (urlMatch) return urlMatch[1];
  const htmlMatch = html.match(/"productId"\s*:\s*"?(\d+)"?/);
  if (htmlMatch) return htmlMatch[1];
  return null;
}

async function fetchShippingDZ(productId: string, refererUrl: string, scraperApiKey?: string): Promise<number | null> {
  try {
    // Primary endpoint
    const freightUrl = `https://www.aliexpress.com/aeglodetailweb/api/logistics/freight?productId=${productId}&count=1&country=DZ&tradeCurrency=USD`;

    let requestUrl = freightUrl;
    const headers: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': refererUrl,
      'Accept-Language': 'en-US,en;q=0.9'
    };

    if (scraperApiKey && scraperApiKey.length > 10) {
      const params = new URLSearchParams({
        api_key: scraperApiKey,
        url: requestUrl,
        country_code: 'us',
        premium: 'true',
        render: 'false',
      });
      requestUrl = `http://api.scraperapi.com?${params.toString()}`;
    }

    console.log('Fetching freight API (primary):', requestUrl);
    const resp = await fetch(requestUrl, { headers });
    const text = await resp.text();

    if (resp.ok) {
      // Try parse JSON
      try {
        const data: any = JSON.parse(text);
        // Free shipping flags
        if (data && (data?.body?.isFreeShipping === true || data?.isFreeShipping === true)) {
          console.log('Freight API reports free shipping (primary)');
          return 0;
        }
        // Value in structured fields (min across candidates)
        const fromJsonCandidates: number[] = [];
        const tryPush = (v: any) => {
          const n = parseFloat(String(v));
          if (!isNaN(n)) fromJsonCandidates.push(n);
        };
        tryPush(data?.body?.freightAmount?.value);
        tryPush(data?.freightAmount?.value);
        tryPush(data?.freight?.value);
        if (Array.isArray(data?.body?.result)) {
          for (const r of data.body.result) {
            tryPush(r?.bizData?.freightAmount?.value);
            tryPush(r?.bizData?.originalFreightAmount?.value);
          }
        }
        if (fromJsonCandidates.length) {
          const min = Math.min(...fromJsonCandidates);
          console.log('Freight JSON candidates (primary):', fromJsonCandidates, '=> min =', min);
          return min;
        }
      } catch (_) {
        // Not JSON or obfuscated; continue with regex extraction below
      }

      // Regex extraction fallback
      const candidates: number[] = [];
      const regexes = [
        /"freightAmount"[^}]*"value":"?([0-9.]+)"?/g,
        /"shippingFee":"?([0-9.]+)"?/g,
        /"freight":"?([0-9.]+)"?/g,
      ];
      for (const re of regexes) {
        const all = text.matchAll(re);
        for (const m of all) {
          const v = parseFloat(m[1]);
          if (!isNaN(v)) candidates.push(v);
        }
      }
      if (/"isFreeShipping"\s*:\s*true/i.test(text) && candidates.length === 0) {
        console.log('Freight API reports free shipping via regex (primary)');
        return 0;
      }
      if (candidates.length > 0) {
        const min = Math.min(...candidates);
        console.log('Freight API shipping candidates (primary):', candidates, '=> min =', min);
        return min;
      }

      if (/not\s*deliver|no\s*logistics|not\s*available\s*to\s*DZ/i.test(text)) {
        console.log('Freight API suggests no shipping to DZ (primary)');
        // Fallthrough to alt endpoint before returning null
      }
    } else {
      console.warn('Freight API returned non-OK status (primary):', resp.status, text.slice(0, 200));
    }

    // ALT endpoint fallback (gpsfront)
    let altUrl = `https://gpsfront.aliexpress.com/getFreight?productId=${productId}&count=1&currency=USD&country=DZ`;
    if (scraperApiKey && scraperApiKey.length > 10) {
      const paramsAlt = new URLSearchParams({ api_key: scraperApiKey, url: altUrl, country_code: 'us', premium: 'true', render: 'false' });
      altUrl = `http://api.scraperapi.com?${paramsAlt.toString()}`;
    }
    console.log('Fetching freight API (alt gpsfront):', altUrl);
    const respAlt = await fetch(altUrl, { headers });
    const textAlt = await respAlt.text();
    if (!respAlt.ok) {
      console.warn('Freight API returned non-OK status (alt):', respAlt.status, textAlt.slice(0, 200));
      // As last fallback, try to detect free shipping quickly
      if (/free\s*shipping/i.test(textAlt) || /"isFreeShipping"\s*:\s*true/i.test(textAlt)) {
        return 0;
      }
      return null;
    }

    try {
      const dataAlt: any = JSON.parse(textAlt);
      // Known shapes
      const candidates: number[] = [];
      const tryPush = (v: any) => {
        const n = parseFloat(String(v));
        if (!isNaN(n)) candidates.push(n);
      };
      if (Array.isArray(dataAlt?.result)) {
        for (const r of dataAlt.result) {
          tryPush(r?.bizData?.freightAmount?.value);
          tryPush(r?.bizData?.originalFreightAmount?.value);
          if (r?.bizData?.isFreeShipping === true) {
            console.log('gpsfront reports free shipping');
            return 0;
          }
        }
      }
      tryPush(dataAlt?.freightAmount?.value);
      tryPush(dataAlt?.body?.freightAmount?.value);

      if (candidates.length > 0) {
        const min = Math.min(...candidates);
        console.log('Freight candidates (alt gpsfront):', candidates, '=> min =', min);
        return min;
      }

      if (dataAlt?.isFreeShipping === true) {
        return 0;
      }
    } catch (_) {
      // Regex fallback on alt
      const candidates: number[] = [];
      const regexes = [
        /"freightAmount"[^}]*"value":"?([0-9.]+)"?/g,
        /"shippingFee":"?([0-9.]+)"?/g,
        /"freight":"?([0-9.]+)"?/g,
      ];
      for (const re of regexes) {
        const all = textAlt.matchAll(re);
        for (const m of all) {
          const v = parseFloat(m[1]);
          if (!isNaN(v)) candidates.push(v);
        }
      }
      if (/"isFreeShipping"\s*:\s*true/i.test(textAlt) && candidates.length === 0) {
        return 0;
      }
      if (candidates.length > 0) {
        const min = Math.min(...candidates);
        console.log('Freight regex candidates (alt):', candidates, '=> min =', min);
        return min;
      }
    }

    console.log('Freight API did not return recognizable shipping values (both endpoints)');
    return null;
  } catch (e) {
    console.error('fetchShippingDZ error:', e);
    return null;
  }
}

