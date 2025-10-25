import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useGamePlatforms } from "@/hooks/useGamePlatforms";
import { useAdminBettingAccounts, useAdminBettingTransactions } from "@/hooks/useBettingPlatforms";

/**
 * Component for testing betting system connections
 * This will help verify that all database connections are working
 */
export const BettingFormTest: React.FC = () => {
  const { data: platforms, isLoading: platformsLoading, error: platformsError } = useGamePlatforms();
  const { data: adminAccounts, isLoading: accountsLoading, error: accountsError } = useAdminBettingAccounts();
  const { data: adminTransactions, isLoading: transactionsLoading, error: transactionsError } = useAdminBettingTransactions();

  const bettingPlatforms = platforms?.filter(p => p.category === 'betting') || [];

  return (
    <div className="container mx-auto p-4 space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>اختبار اتصال قاعدة البيانات - نظام المراهنات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test 1: Game Platforms */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              1. منصات المراهنات
              {platformsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : platformsError ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </h3>
            {platformsError ? (
              <div className="text-sm text-destructive">
                خطأ: {(platformsError as Error).message}
              </div>
            ) : platformsLoading ? (
              <div className="text-sm text-muted-foreground">جاري التحميل...</div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm">
                  عدد المنصات: <Badge>{bettingPlatforms.length}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {bettingPlatforms.map(platform => (
                    <Badge key={platform.id} variant="secondary">
                      {platform.name_ar}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Test 2: Betting Accounts */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              2. حسابات المراهنات (Admin)
              {accountsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : accountsError ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </h3>
            {accountsError ? (
              <div className="text-sm text-destructive">
                خطأ: {(accountsError as Error).message}
              </div>
            ) : accountsLoading ? (
              <div className="text-sm text-muted-foreground">جاري التحميل...</div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm">
                  عدد الحسابات: <Badge>{adminAccounts?.length || 0}</Badge>
                </div>
                {adminAccounts && adminAccounts.length > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    آخر حساب: {adminAccounts[0]?.player_id || 'N/A'}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    لا توجد حسابات بعد
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Test 3: Betting Transactions */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              3. معاملات المراهنات (Admin)
              {transactionsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : transactionsError ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </h3>
            {transactionsError ? (
              <div className="text-sm text-destructive">
                خطأ: {(transactionsError as Error).message}
              </div>
            ) : transactionsLoading ? (
              <div className="text-sm text-muted-foreground">جاري التحميل...</div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm">
                  عدد المعاملات: <Badge>{adminTransactions?.length || 0}</Badge>
                </div>
                {adminTransactions && adminTransactions.length > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    آخر معاملة: {adminTransactions[0]?.transaction_type || 'N/A'}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    لا توجد معاملات بعد
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-2">الملخص</h3>
            <div className="text-sm space-y-1">
              {!platformsError && !accountsError && !transactionsError ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  جميع الاتصالات تعمل بنجاح!
                </div>
              ) : (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  يوجد أخطاء في بعض الاتصالات
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
