import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { 
  Wallet,
  Eye,
  EyeOff,
  CheckCircle,
  Shield,
  Bell,
  LogOut
} from "lucide-react";

interface HeaderProps {
  balance: any;
  balanceLoading: boolean;
  showBalance: boolean;
  setShowBalance: (show: boolean) => void;
  profile: any;
  quickActions: Array<{
    icon: React.ReactNode;
    title: string;
    desc: string;
  }>;
}

const Header = ({ 
  balance, 
  balanceLoading, 
  showBalance, 
  setShowBalance, 
  profile,
  quickActions 
}: HeaderProps) => {
  const { signOut } = useAuth();
  const { isAdmin } = useUserRoles();
  const navigate = useNavigate();

  return (
    <header className="relative bg-gradient-hero overflow-hidden">
      <div className="absolute inset-0 bg-gradient-glass"></div>
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="bg-gradient-primary p-3 rounded-2xl shadow-glow animate-glow-pulse">
                <Wallet className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="animate-slide-up">
              <h1 className="text-3xl font-bold text-white mb-1">OpaY الجزائر</h1>
              <p className="text-white/80">محفظتك الرقمية المتطورة</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {/* Admin Panel Access */}
              {isAdmin && (
                <div className="relative group">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/admin')}
                    className="w-10 h-10 p-0 bg-gradient-primary/20 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-gradient-primary/30 transition-all"
                  >
                    <Shield className="h-5 w-5 text-white" />
                  </Button>
                  <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    لوحة الإدارة
                  </div>
                </div>
              )}
              
              {/* Account Status Icon */}
              {profile?.is_account_activated ? (
                <div className="relative group">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-secondary/20 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-gradient-secondary/30 transition-all cursor-pointer">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    الحساب مفعل
                  </div>
                </div>
              ) : (
                <Link to="/activate">
                  <div className="relative group">
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-gold/20 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-gradient-gold/30 transition-all animate-pulse">
                      <Bell className="h-5 w-5 text-white" />
                    </div>
                    <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      تفعيل الحساب
                    </div>
                  </div>
                </Link>
              )}
              
              {/* Logout Icon */}
              <div className="relative group">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => signOut()}
                  className="w-10 h-10 p-0 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/20 transition-all"
                >
                  <LogOut className="h-5 w-5 text-white" />
                </Button>
                <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  تسجيل الخروج
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Balance Display */}
        <div className="bg-gradient-glass backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-elevated">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/70 text-sm mb-1">الرصيد المتاح</p>
              <div className="flex items-center gap-2">
                <span className="text-4xl font-bold text-white">
                  {balanceLoading ? (
                    <div className="h-10 bg-white/20 rounded animate-pulse w-32" />
                  ) : (
                    showBalance ? `${(balance?.balance ?? 0).toFixed(2)}` : "••••••"
                  )}
                </span>
                <span className="text-xl text-white/80 font-medium">دج</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowBalance(!showBalance)}
              className="text-white/70 hover:text-white hover:bg-white/10 border border-white/20"
            >
              {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </Button>
          </div>
          
          {/* Quick Actions Row */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            {quickActions.map((action, index) => (
              <Button 
                key={index}
                variant="ghost" 
                className="flex-col h-auto py-3 text-white/80 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
              >
                {action.icon}
                <span className="text-xs mt-1">{action.title}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;