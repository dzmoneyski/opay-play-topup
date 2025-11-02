import { useEffect, useState } from "react";
import opayIcon from "@/assets/opay-icon-original.png";

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show splash screen for 2.5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 500); // Wait for fade out animation
    }, 2500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!isVisible) {
    return (
      <div className="fixed inset-0 bg-gradient-hero z-[9999] flex items-center justify-center animate-fade-out pointer-events-none">
        <div className="text-center animate-scale-out">
          <div className="w-32 h-32 mx-auto mb-6 animate-float">
            <img 
              src={opayIcon} 
              alt="OpaY" 
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-hero z-[9999] flex items-center justify-center">
      <div className="text-center">
        {/* Animated Logo */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-primary/30 rounded-full blur-3xl animate-glow-pulse" />
          
          {/* Logo */}
          <div className="relative w-full h-full animate-scale-in">
            <img 
              src={opayIcon} 
              alt="OpaY" 
              className="w-full h-full object-contain drop-shadow-2xl animate-float"
            />
          </div>
        </div>

        {/* Loading dots */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white/80 animate-bounce [animation-delay:-0.3s]" />
          <div className="w-3 h-3 rounded-full bg-white/80 animate-bounce [animation-delay:-0.15s]" />
          <div className="w-3 h-3 rounded-full bg-white/80 animate-bounce" />
        </div>
      </div>
    </div>
  );
};
