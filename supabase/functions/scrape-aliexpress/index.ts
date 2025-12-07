import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeRequest {
  url: string;
}

interface ScrapeResponse {
  images: string[];
  error?: string;
}

function extractMetaImages(html: string): string[] {
  const images: string[] = [];
  const metaOg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  if (metaOg && metaOg[1]) images.push(metaOg[1]);
  const metaTwitter = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  if (metaTwitter && metaTwitter[1]) images.push(metaTwitter[1]);
  return images;
}

function extractRunParamsImages(html: string): string[] {
  const images: string[] = [];
  const runParamsRegex = /window\.(?:runParams|__INIT_DATA__)\s*=\s*(\{[\s\S]*?\});/m;
  const match = html.match(runParamsRegex);
  if (match) {
    try {
      // Some pages include trailing semicolons/comments after JSON; slice to last closing brace
      const jsonRaw = match[1];
      const jsonText = jsonRaw.trim().replace(/;$/, '');
      const data = JSON.parse(jsonText);
      // Common AliExpress structures
      const candidates: any[] = [];
      if (data.imageModule?.imagePathList) candidates.push(...data.imageModule.imagePathList);
      if (data.images) candidates.push(...data.images);
      if (data.productInfoComponent?.imageModule?.imagePathList) candidates.push(...data.productInfoComponent.imageModule.imagePathList);
      for (const url of candidates) {
        if (typeof url === 'string') images.push(url);
      }
    } catch (e) {
      console.log('Failed to parse window.runParams JSON:', e);
      // Fallback: regex array extractor
      const listMatch = html.match(/imagePathList"\s*:\s*\[(.*?)\]/s);
      if (listMatch) {
        const urls = listMatch[1].match(/"(https?:[^"\]]+?)"/g) || [];
        images.push(...urls.map((u) => u.replace(/"/g, '')));
      }
    }
  }
  return images;
}

function extractAliCdnImages(html: string): string[] {
  const images: string[] = [];
  const patterns = [
    /https?:\/\/[^"'\s]+\.alicdn\.com\/[^"'\s]+_\d+x\d+[^"'\s]*\.(?:jpg|png|webp)/gi,
    /https?:\/\/[^"'\s]+\.alicdn\.com\/[^"'\s]+\.(?:jpg|png|webp)/gi,
  ];
  for (const p of patterns) {
    const matches = html.match(p) || [];
    for (let m of matches) {
      m = m.replace(/\\/g, '').replace(/&amp;/g, '&');
      if (!images.includes(m)) images.push(m);
    }
  }
  return images;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url }: ScrapeRequest = await req.json();

    console.log('Scraping AliExpress URL:', url);

    // Validate URL format and ensure it's a legitimate AliExpress domain
    let isValidAliExpressUrl = false;
    try {
      const urlObj = new URL(url);
      const validHosts = ['aliexpress.com', 'www.aliexpress.com', 'm.aliexpress.com', 'ar.aliexpress.com'];
      isValidAliExpressUrl = validHosts.some(h => urlObj.hostname === h || urlObj.hostname.endsWith('.' + h));
    } catch {
      isValidAliExpressUrl = false;
    }

    if (!url || !isValidAliExpressUrl) {
      return new Response(
        JSON.stringify({ images: [], error: 'رابط AliExpress غير صحيح' } satisfies ScrapeResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('ZENROWS_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ images: [], error: 'مفقود ZENROWS_API_KEY في الأسرار' } satisfies ScrapeResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch using ZenRows with JS rendering & premium proxies to bypass bot protection
    const zenrowsUrl = `https://api.zenrows.com/v1/?apikey=${apiKey}&url=${encodeURIComponent(url)}&js_render=true&premium_proxy=true&device=desktop`;

    const response = await fetch(zenrowsUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ar,en;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      console.error('ZenRows fetch failed:', response.status, await response.text().catch(() => ''));
      return new Response(
        JSON.stringify({ images: [], error: 'فشل في جلب بيانات المنتج (ZenRows)' } satisfies ScrapeResponse),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    console.log('HTML fetched via ZenRows, length:', html.length);

    // Try multiple extraction strategies
    const images = [
      ...extractMetaImages(html),
      ...extractRunParamsImages(html),
      ...extractAliCdnImages(html),
    ];

    const unique = [...new Set(images)].filter((u) => u.startsWith('http'));
    console.log('Found images (unique):', unique.length);

    if (unique.length === 0) {
      return new Response(
        JSON.stringify({ images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30'], error: 'تعذر استخراج الصور، أعد المحاولة أو استخدم رابطاً آخر' } satisfies ScrapeResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prefer large images by removing small size suffixes if present
    const normalized = unique.map((u) => u.replace(/_(?:50|100|200|300|400|640|800)x\1/g, ''));

    return new Response(
      JSON.stringify({ images: normalized.slice(0, 10) } satisfies ScrapeResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scrape-aliexpress:', error);
    return new Response(
      JSON.stringify({ images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30'], error: 'حدث خطأ أثناء جلب الصور' } satisfies ScrapeResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
