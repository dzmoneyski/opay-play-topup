// Import all platform logos
import xbetLogo from "@/assets/1xbet-logo.png";
import xpariLogo from "@/assets/xparibet-logo.png";
import gooobetLogo from "@/assets/gooobet-logo.png";
import pubgLogo from "@/assets/pubg-logo.png";
import freefireLogo from "@/assets/freefire-logo.png";
import codmLogo from "@/assets/codm-logo.png";
import mlbbLogo from "@/assets/mlbb-logo.png";

// Map platform slugs to their logos
export const platformLogos: Record<string, string> = {
  '1xbet': xbetLogo,
  'xparibet': xpariLogo,
  'gooobet': gooobetLogo,
  'pubg': pubgLogo,
  'freefire': freefireLogo,
  'codm': codmLogo,
  'mobilelegends': mlbbLogo,
  'linbet': '', // Already has logo in database
  'melbet': '', // Already has logo in database
};

// Get logo for a platform by slug
export const getPlatformLogo = (slug: string, databaseUrl: string | null): string | null => {
  // If platform already has a logo in database, use it
  if (databaseUrl) {
    return databaseUrl;
  }
  
  // Otherwise, use local logo
  return platformLogos[slug] || null;
};
