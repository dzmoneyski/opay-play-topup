import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowRight, Wallet } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-accent/5 flex items-center justify-center" dir="rtl">
      <div className="container mx-auto px-4">
        <Card className="max-w-md mx-auto shadow-elevated border-0 bg-gradient-card">
          <CardContent className="p-8 text-center">
            <div className="bg-gradient-primary p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Wallet className="h-10 w-10 text-white" />
            </div>
            
            <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
            <h2 className="text-xl font-semibold mb-2">الصفحة غير موجودة</h2>
            <p className="text-muted-foreground mb-6">
              عذراً، لا يمكننا العثور على الصفحة التي تبحث عنها في OpaY
            </p>
            
            <div className="space-y-3">
              <Button asChild className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300">
                <Link to="/">
                  <Home className="h-4 w-4 ml-2" />
                  العودة للصفحة الرئيسية
                </Link>
              </Button>
              
              <Button variant="outline" className="w-full border-primary/20 hover:bg-primary/5" onClick={() => window.history.back()}>
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
