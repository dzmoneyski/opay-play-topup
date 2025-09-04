import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface Transaction {
  id: number;
  type: string;
  desc: string;
  amount: number;
  icon: React.ReactNode;
  time: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

const RecentTransactions = ({ transactions }: RecentTransactionsProps) => {
  return (
    <div className="animate-slide-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
      <Card className="shadow-card border-0 bg-gradient-card backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-xl bg-gradient-primary">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            المعاملات الأخيرة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {transactions.map((transaction, index) => (
            <div 
              key={transaction.id} 
              className="group flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-gradient-primary/5 transition-all duration-300 hover:shadow-soft border border-transparent hover:border-primary/10"
              style={{ animationDelay: `${0.1 * index}s`, animationFillMode: 'both' }}
            >
              <div className="flex items-center gap-4">
                <div className={`
                  p-3 rounded-xl transition-all duration-300 group-hover:scale-110
                  ${transaction.amount > 0 
                    ? 'bg-gradient-secondary text-white shadow-soft' 
                    : 'bg-gradient-primary text-white shadow-soft'
                  }
                `}>
                  {transaction.icon}
                </div>
                <div>
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {transaction.desc}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{transaction.type}</span>
                    <span>•</span>
                    <span>{transaction.time}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`
                  p-1 rounded-lg
                  ${transaction.amount > 0 ? 'bg-success/10' : 'bg-primary/10'}
                `}>
                  {transaction.amount > 0 ? (
                    <ArrowDownLeft className="h-4 w-4 text-success" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-primary" />
                  )}
                </div>
                <span className={`
                  font-bold text-lg
                  ${transaction.amount > 0 ? 'text-success' : 'text-primary'}
                `}>
                  {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)} دج
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecentTransactions;