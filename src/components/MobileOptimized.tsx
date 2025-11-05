import React from 'react';
import { cn } from '@/lib/utils';

// مكون للأزرار المحسّنة للهاتف
export const MobileButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "min-h-[44px] min-w-[44px] touch-manipulation active:scale-95 transition-transform",
      className
    )}
    {...props}
  >
    {children}
  </button>
));
MobileButton.displayName = "MobileButton";

// مكون للبطاقات المحسّنة للهاتف
export const MobileCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl p-4 md:p-6 shadow-card transition-all duration-300 active:scale-[0.98] touch-manipulation",
      className
    )}
    {...props}
  >
    {children}
  </div>
));
MobileCard.displayName = "MobileCard";

// مكون لعناصر القائمة المحسّنة للهاتف
export const MobileMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "min-h-[56px] flex items-center gap-3 px-4 py-3 rounded-xl touch-manipulation active:scale-[0.98] transition-all duration-200",
      className
    )}
    {...props}
  >
    {children}
  </div>
));
MobileMenuItem.displayName = "MobileMenuItem";

// مكون للأيقونات المحسّنة للهاتف
export const MobileIconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: 'sm' | 'md' | 'lg';
  }
>(({ className, size = 'md', children, ...props }, ref) => {
  const sizeClasses = {
    sm: 'h-10 w-10 md:h-8 md:w-8',
    md: 'h-12 w-12 md:h-10 md:w-10',
    lg: 'h-14 w-14 md:h-12 md:w-12'
  };

  return (
    <button
      ref={ref}
      className={cn(
        sizeClasses[size],
        "flex items-center justify-center rounded-full touch-manipulation active:scale-90 transition-transform",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
MobileIconButton.displayName = "MobileIconButton";

// مكون للنصوص القابلة للقراءة على الهاتف
export const MobileText = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    size?: 'sm' | 'md' | 'lg' | 'xl';
  }
>(({ className, size = 'md', children, ...props }, ref) => {
  const sizeClasses = {
    sm: 'text-sm md:text-xs',
    md: 'text-base md:text-sm',
    lg: 'text-lg md:text-base',
    xl: 'text-xl md:text-lg'
  };

  return (
    <p
      ref={ref}
      className={cn(sizeClasses[size], className)}
      {...props}
    >
      {children}
    </p>
  );
});
MobileText.displayName = "MobileText";
