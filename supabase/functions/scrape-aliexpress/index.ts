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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url }: ScrapeRequest = await req.json();

    console.log('Scraping AliExpress URL:', url);

    if (!url || !url.includes('aliexpress.com')) {
      return new Response(
        JSON.stringify({ 
          images: [],
          error: 'رابط AliExpress غير صحيح' 
        } as ScrapeResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch URL:', response.status);
      return new Response(
        JSON.stringify({ 
          images: [],
          error: 'فشل في جلب بيانات المنتج' 
        } as ScrapeResponse),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const html = await response.text();
    console.log('HTML fetched successfully, length:', html.length);

    // Extract images from the HTML
    const images: string[] = [];
    
    // Pattern 1: Look for main product images in various formats
    const imagePatterns = [
      // Main product images
      /https?:\/\/[^"'\s]+\.alicdn\.com\/[^"'\s]+_\d+x\d+[^"'\s]*\.jpg/gi,
      /https?:\/\/[^"'\s]+\.alicdn\.com\/[^"'\s]+\.jpg/gi,
      /https?:\/\/[^"'\s]+\.alicdn\.com\/[^"'\s]+\.png/gi,
      /https?:\/\/[^"'\s]+\.alicdn\.com\/[^"'\s]+\.webp/gi,
      // Alternative patterns
      /"imageUrl":"([^"]+)"/gi,
      /"imgUrl":"([^"]+)"/gi,
      /data-src="([^"]+\.jpg[^"]*)"/gi,
    ];

    for (const pattern of imagePatterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        let imageUrl = match[1] || match[0];
        
        // Clean up the URL
        imageUrl = imageUrl.replace(/\\/g, '');
        imageUrl = imageUrl.replace(/&amp;/g, '&');
        
        // Ensure it's a valid URL
        if (imageUrl.startsWith('http') && !images.includes(imageUrl)) {
          // Skip small thumbnail images
          if (!imageUrl.includes('_50x50') && !imageUrl.includes('_100x100')) {
            images.push(imageUrl);
          }
        }
      }
    }

    // Try to find images in JSON-LD or structured data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (jsonData.image) {
          if (Array.isArray(jsonData.image)) {
            images.push(...jsonData.image);
          } else if (typeof jsonData.image === 'string') {
            images.push(jsonData.image);
          }
        }
      } catch (e) {
        console.log('Failed to parse JSON-LD:', e);
      }
    }

    // Remove duplicates and limit to first 10 images
    const uniqueImages = [...new Set(images)].slice(0, 10);

    console.log('Found images:', uniqueImages.length);

    // If no images found, return placeholder
    if (uniqueImages.length === 0) {
      return new Response(
        JSON.stringify({ 
          images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30'],
          error: 'لم يتم العثور على صور، سيتم استخدام صورة افتراضية' 
        } as ScrapeResponse),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        images: uniqueImages 
      } as ScrapeResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in scrape-aliexpress:', error);
    return new Response(
      JSON.stringify({ 
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30'],
        error: 'حدث خطأ أثناء جلب الصور' 
      } as ScrapeResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
