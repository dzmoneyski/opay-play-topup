import { useLocation, Link, useNavigate } from "react-router-dom";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowRight, Wallet, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-gradient-glass"></div>
      
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="w-12 h-12 p-0 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/20 transition-all group"
        >
          <ArrowLeft className="h-5 w-5 text-white group-hover:text-white transition-colors" />
        </Button>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <Card className="max-w-md mx-auto shadow-elevated border-0 bg-gradient-glass backdrop-blur-xl border border-white/10">
          <CardContent className="p-8 text-center">
            <div className="bg-gradient-primary p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-glow animate-glow-pulse">
              <Wallet className="h-10 w-10 text-white" />
            </div>
            
            <h1 className="text-6xl font-bold text-white mb-4">404</h1>
            <h2 className="text-xl font-semibold mb-2 text-white">الصفحة غير موجودة</h2>
              <p className="text-white/80 mb-6">
                عذراً، لا يمكننا العثور على الصفحة التي تبحث عنها في OpaY الجزائر
              </p>
            
            <div className="space-y-3">
              <Button asChild className="w-full bg-gradient-primary hover:opacity-90 text-white transition-all duration-300">
                <Link to="/">
                  <Home className="h-4 w-4 ml-2" />
                  العودة للصفحة الرئيسية
                </Link>
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full text-white/80 hover:text-white hover:bg-white/10 border border-white/20" 
                onClick={() => navigate(-1)}
              >
                <ArrowRight className="h-4 w-4 ml-2" />
                العودة للصفحة السابقة
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
