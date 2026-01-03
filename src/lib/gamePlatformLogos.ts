// Import all platform logos
import xbetLogo from "@/assets/1xbet-logo.png";
import xpariLogo from "@/assets/xparibet-logo.png";
import gooobetLogo from "@/assets/gooobet-logo.png";
import pubgLogo from "@/assets/pubg-logo.png";
import freefireLogo from "@/assets/freefire-logo.png";
import codmLogo from "@/assets/codm-logo.png";
import mlbbLogo from "@/assets/mlbb-logo.png";

// New game logos
import valorantLogo from "@/assets/game-logos/valorant-logo.png";
import apexLogo from "@/assets/game-logos/apex-logo.png";
import minecraftLogo from "@/assets/game-logos/minecraft-logo.png";
import finalfantasyLogo from "@/assets/game-logos/finalfantasy-logo.png";
import fortniteLogo from "@/assets/game-logos/fortnite-logo.png";
import pubgnewstateLogo from "@/assets/game-logos/pubgnewstate-logo.png";
import nintendoUsLogo from "@/assets/game-logos/nintendo-us-logo.png";
import nintendoEuLogo from "@/assets/game-logos/nintendo-eu-logo.png";
import robloxEuLogo from "@/assets/game-logos/roblox-eu-logo.png";
import robloxUsLogo from "@/assets/game-logos/roblox-us-logo.png";
import lolLogo from "@/assets/game-logos/lol-logo.png";
import xboxEurLogo from "@/assets/game-logos/xbox-eur-logo.png";
import xboxUsdLogo from "@/assets/game-logos/xbox-usd-logo.png";
import steamUsdLogo from "@/assets/game-logos/steam-usd-logo.png";
import steamEurLogo from "@/assets/game-logos/steam-eur-logo.png";
import originLogo from "@/assets/game-logos/origin-logo.png";
import runescapeLogo from "@/assets/game-logos/runescape-logo.png";
import blizzardLogo from "@/assets/game-logos/blizzard-logo.png";

// Map platform slugs to their logos
export const platformLogos: Record<string, string> = {
  // Existing platforms
  '1xbet': xbetLogo,
  'xparibet': xpariLogo,
  'gooobet': gooobetLogo,
  'pubg': pubgLogo,
  'freefire': freefireLogo,
  'codm': codmLogo,
  'mobilelegends': mlbbLogo,
  'linbet': '',
  'melbet': '',
  
  // New game platforms
  'valorant': valorantLogo,
  'apex': apexLogo,
  'minecraft': minecraftLogo,
  'finalfantasy': finalfantasyLogo,
  'fortnite': fortniteLogo,
  'pubgnewstate': pubgnewstateLogo,
  'nintendo-us': nintendoUsLogo,
  'nintendo-eu': nintendoEuLogo,
  'roblox-eu': robloxEuLogo,
  'roblox-us': robloxUsLogo,
  'lol': lolLogo,
  'xbox-eur': xboxEurLogo,
  'xbox-usd': xboxUsdLogo,
  'steam-usd': steamUsdLogo,
  'steam-eur': steamEurLogo,
  'origin': originLogo,
  'runescape': runescapeLogo,
  'blizzard': blizzardLogo,
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
