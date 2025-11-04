import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import opayLogo from "@/assets/opay-icon-original.png";

export const InstallBanner = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('install-banner-dismissed');
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const permissionsPrompted = localStorage.getItem('pwa-permissions-prompted');
    
    // Don't show install banner until permissions prompt is done
    if (!isInstalled && !dismissed && permissionsPrompted) {
      setTimeout(() => setIsVisible(true), 2000);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('install-banner-dismissed', 'true');
  };

  const handleInstall = () => {
    navigate('/install');
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent backdrop-blur-sm pointer-events-none" />
      
      <div className="relative bg-gradient-primary shadow-elevated border-t border-white/20">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-glow/20 via-transparent to-primary-glow/20 animate-shimmer pointer-events-none" />
        
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left side - Icon & Text */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Icon with animation */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
                  <img src={opayLogo} alt="OpaY" className="w-full h-full object-contain animate-float rounded-full" />
                </div>
                {/* Sparkle indicator */}
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center animate-glow-pulse">
                  <Sparkles className="h-3 w-3 text-accent-foreground" />
                </div>
              </div>
              
              {/* Text content */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base text-white mb-0.5 tracking-tight">
                  حمّل تطبيق OpaY
                </p>
                <p className="text-sm text-white/90 font-medium">
                  تجربة أسرع • إشعارات فورية • وصول مباشر
                </p>
              </div>
            </div>

            {/* Right side - Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                onClick={handleInstall}
                className="bg-white text-primary hover:bg-white/95 font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 px-6"
              >
                تثبيت الآن
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDismiss}
                className="text-white/80 hover:text-white hover:bg-white/20 w-9 h-9 rounded-lg transition-all duration-300"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
