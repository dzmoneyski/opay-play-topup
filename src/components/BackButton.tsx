import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  className?: string;
  variant?: 'default' | 'floating';
}

const BackButton = ({ className = '', variant = 'floating' }: BackButtonProps) => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    // Try to go back in history, if no history, go to home page
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const baseClasses = "w-12 h-12 p-0 bg-gradient-glass backdrop-blur-sm rounded-xl border border-primary/20 hover:border-primary/40 shadow-soft hover:shadow-card transition-smooth group hover:scale-105";
  const floatingClasses = "absolute top-6 left-6 z-30";
  
  return (
    <div className={variant === 'floating' ? floatingClasses : ''}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBackClick}
        className={`${baseClasses} ${className}`}
      >
        <ArrowLeft className="h-5 w-5 text-primary-foreground group-hover:text-primary transition-smooth" />
      </Button>
    </div>
  );
};

export default BackButton;