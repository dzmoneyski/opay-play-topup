import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const InstallBanner = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed or dismissed
    const dismissed = localStorage.getItem('install-banner-dismissed');
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    
    if (!isInstalled && !dismissed) {
      // Show banner after a short delay
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
      <div className="bg-gradient-primary text-white shadow-elevated backdrop-blur-xl border-t border-white/10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Download className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">حمّل تطبيق OpaY</p>
                <p className="text-xs text-white/80">تجربة أفضل وأسرع مع التطبيق</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleInstall}
                className="bg-white text-primary hover:bg-white/90 font-semibold"
              >
                تثبيت
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-white hover:bg-white/20 w-8 h-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
