import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';
import { useAliExpressOrders } from '@/hooks/useAliExpressOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowRight, 
  Download, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Repeat, 
  Gift, 
  Gamepad2,
  FileText,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Package
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import jsPDF from 'jspdf';
import { useProfile } from '@/hooks/useProfile';

const Transactions = () => {
  const navigate = useNavigate();
  const { transactions, loading } = useTransactionHistory(); // No limit = show all
  const { orders: aliexpressOrders, loading: aliexpressLoading } = useAliExpressOrders();
  const { profile } = useProfile();
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-5 w-5" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-5 w-5" />;
      case 'transfer_sent':
      case 'transfer_received':
        return <Repeat className="h-5 w-5" />;
      case 'gift_card':
        return <Gift className="h-5 w-5" />;
      case 'betting':
      case 'game_topup':
        return <Gamepad2 className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      completed: { label: 'مكتمل', variant: 'default' },
      pending: { label: 'قيد المعالجة', variant: 'secondary' },
      rejected: { label: 'مرفوض', variant: 'destructive' },
      approved: { label: 'موافق عليه', variant: 'default' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getAmountColor = (type: string) => {
    if (type === 'deposit' || type === 'transfer_received') {
      return 'text-green-600';
    } else if (type === 'withdrawal' || type === 'transfer_sent' || type === 'betting' || type === 'game_topup') {
      return 'text-red-600';
    }
    return 'text-foreground';
  };

  const getAmountPrefix = (type: string) => {
    if (type === 'deposit' || type === 'transfer_received') {
      return '+';
    } else if (type === 'withdrawal' || type === 'transfer_sent' || type === 'betting' || type === 'game_topup') {
      return '-';
    }
    return '';
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Add Arabic font support (simplified - in production you'd want to add a proper Arabic font)
    doc.setFont('helvetica');
    doc.setFontSize(20);
    doc.text('Statement Account', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Name: ${profile?.full_name || 'N/A'}`, 20, 40);
    doc.text(`Phone: ${profile?.phone || 'N/A'}`, 20, 50);
    doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, 20, 60);
    
    doc.setFontSize(10);
    let yPosition = 80;
    
    doc.text('Date', 20, yPosition);
    doc.text('Type', 70, yPosition);
    doc.text('Amount', 120, yPosition);
    doc.text('Status', 160, yPosition);
    
    yPosition += 10;
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 5;
    
    transactions.forEach((transaction) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      const date = format(new Date(transaction.created_at), 'dd/MM/yyyy', { locale: ar });
      const amount = `${getAmountPrefix(transaction.type)}${transaction.amount.toLocaleString('ar-DZ')} DZD`;
      
      doc.text(date, 20, yPosition);
      doc.text(transaction.description.substring(0, 20), 70, yPosition);
      doc.text(amount, 120, yPosition);
      doc.text(transaction.status, 160, yPosition);
      
      yPosition += 8;
    });
    
    doc.save(`statement-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-background" dir="rtl">
      <div className="container max-w-4xl mx-auto p-4 pb-20 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="rounded-xl"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">المعاملات</h1>
              <p className="text-sm text-muted-foreground">جميع معاملاتك في مكان واحد</p>
            </div>
          </div>
          
          <Button
            onClick={generatePDF}
            className="bg-gradient-primary hover:opacity-90 text-white shadow-glow"
          >
            <Download className="h-4 w-4 ml-2" />
            تصدير PDF
          </Button>
        </div>

        {/* Transactions List */}
        <Card className="shadow-card border-0 bg-gradient-card backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-foreground">
              <div className="p-2 rounded-xl bg-gradient-primary">
                <FileText className="h-5 w-5 text-white" />
              </div>
              سجل المعاملات ({transactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 rounded-xl bg-muted/50 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded-xl"></div>
                        <div className="space-y-2">
                          <div className="w-32 h-4 bg-muted rounded"></div>
                          <div className="w-24 h-3 bg-muted rounded"></div>
                        </div>
                      </div>
                      <div className="w-20 h-6 bg-muted rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">لا توجد معاملات</p>
                <p className="text-sm">ابدأ باستخدام التطبيق لرؤية معاملاتك هنا</p>
              </div>
            ) : (
              transactions.map((transaction) => (
                <div key={transaction.id} className="space-y-2">
                  <div 
                    className="group p-4 rounded-xl bg-muted/50 hover:bg-gradient-primary/5 transition-all duration-300 hover:shadow-soft border border-transparent hover:border-primary/10 cursor-pointer"
                    onClick={() => setExpandedTransaction(
                      expandedTransaction === transaction.id ? null : transaction.id
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-3 rounded-xl bg-gradient-primary text-white group-hover:scale-110 transition-transform">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {transaction.description}
                            {transaction.transaction_number && (
                              <span className="text-xs text-muted-foreground mr-2">
                                #{transaction.transaction_number}
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(transaction.created_at), 'dd MMM yyyy - hh:mm a', { locale: ar })}
                            </p>
                            {getStatusBadge(transaction.status)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className={`text-lg font-bold ${getAmountColor(transaction.type)}`}>
                          {getAmountPrefix(transaction.type)}{transaction.amount.toLocaleString('ar-DZ')} دج
                        </p>
                        {expandedTransaction === transaction.id ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  {expandedTransaction === transaction.id && (
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3 animate-in slide-in-from-top-2">
                      <h4 className="font-semibold text-foreground mb-3">تفاصيل المعاملة</h4>
                      <Separator />
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {transaction.transaction_number && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground mb-1">رقم المعاملة</p>
                            <p className="font-mono font-bold text-primary text-lg">
                              #{transaction.transaction_number}
                            </p>
                          </div>
                        )}
                        
                        <div>
                          <p className="text-muted-foreground mb-1">معرف المعاملة</p>
                          <p className="font-mono font-medium text-foreground">
                            {transaction.id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-muted-foreground mb-1">النوع</p>
                          <p className="font-medium text-foreground">{transaction.description}</p>
                        </div>
                        
                        <div>
                          <p className="text-muted-foreground mb-1">المبلغ</p>
                          <p className={`font-bold ${getAmountColor(transaction.type)}`}>
                            {getAmountPrefix(transaction.type)}{transaction.amount.toLocaleString('ar-DZ')} دج
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-muted-foreground mb-1">الحالة</p>
                          {getStatusBadge(transaction.status)}
                        </div>
                        
                        <div className="col-span-2">
                          <p className="text-muted-foreground mb-1">التاريخ والوقت</p>
                          <p className="font-medium text-foreground">
                            {format(new Date(transaction.created_at), 'EEEE, dd MMMM yyyy - hh:mm:ss a', { locale: ar })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Transactions;
