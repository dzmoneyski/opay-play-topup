import { useState, useEffect } from 'react';
import { Users, Calendar, TrendingUp, DollarSign, CheckCircle, XCircle, Clock, Loader2, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AgentStats {
  agent_id: string;
  agent_name: string;
  agent_phone: string;
  total_orders: number;
  approved_orders: number;
  rejected_orders: number;
  pending_orders: number;
  total_approved_amount: number;
  total_rejected_amount: number;
  total_pending_amount: number;
  total_fees_collected: number;
  net_due: number; // المبلغ المستحق للوكيل = إجمالي الشحن - الرسوم
}

interface DateRange {
  label: string;
  value: string;
  startDate: Date;
  endDate: Date;
}

const getDateRanges = (): DateRange[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  return [
    { label: 'اليوم', value: 'today', startDate: today, endDate: now },
    { label: 'أمس', value: 'yesterday', startDate: yesterday, endDate: today },
    { label: 'هذا الأسبوع', value: 'this_week', startDate: weekStart, endDate: now },
    { label: 'هذا الشهر', value: 'this_month', startDate: monthStart, endDate: now },
    { label: 'الشهر الماضي', value: 'last_month', startDate: lastMonthStart, endDate: lastMonthEnd },
    { label: 'الكل', value: 'all', startDate: new Date(2020, 0, 1), endDate: now },
  ];
};

const AgentAccountingReport = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [totals, setTotals] = useState({
    totalOrders: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalPending: 0,
    totalApprovedAmount: 0,
    totalRejectedAmount: 0,
    totalPendingAmount: 0,
    totalFees: 0,
    totalNetDue: 0,
  });

  const dateRanges = getDateRanges();

  useEffect(() => {
    fetchAgentStats();
  }, [selectedPeriod]);

  const fetchAgentStats = async () => {
    setLoading(true);
    try {
      const range = dateRanges.find(r => r.value === selectedPeriod);
      if (!range) return;

      // Fetch orders with date filter
      let query = supabase
        .from('phone_topup_orders')
        .select('*')
        .not('processed_by', 'is', null);

      if (selectedPeriod !== 'all') {
        query = query
          .gte('processed_at', range.startDate.toISOString())
          .lte('processed_at', range.endDate.toISOString());
      }

      const { data: orders, error } = await query;

      if (error) throw error;

      // Get unique agent IDs
      const agentIds = [...new Set((orders || []).map(o => o.processed_by).filter(Boolean))];

      // Fetch agent profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', agentIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Calculate stats per agent
      const statsMap = new Map<string, AgentStats>();

      for (const order of orders || []) {
        if (!order.processed_by) continue;

        const agentId = order.processed_by;
        const profile = profilesMap.get(agentId);

        if (!statsMap.has(agentId)) {
          statsMap.set(agentId, {
            agent_id: agentId,
            agent_name: profile?.full_name || 'غير معروف',
            agent_phone: profile?.phone || '',
            total_orders: 0,
            approved_orders: 0,
            rejected_orders: 0,
            pending_orders: 0,
            total_approved_amount: 0,
            total_rejected_amount: 0,
            total_pending_amount: 0,
            total_fees_collected: 0,
            net_due: 0,
          });
        }

        const stats = statsMap.get(agentId)!;
        stats.total_orders++;

        if (order.status === 'approved') {
          stats.approved_orders++;
          stats.total_approved_amount += order.amount || 0;
          stats.total_fees_collected += order.fee_amount || 0;
        } else if (order.status === 'rejected') {
          stats.rejected_orders++;
          stats.total_rejected_amount += order.amount || 0;
        } else if (order.status === 'pending') {
          stats.pending_orders++;
          stats.total_pending_amount += order.amount || 0;
        }
      }

      // Calculate net due for each agent
      const agentStatsArray = Array.from(statsMap.values()).map(agent => ({
        ...agent,
        net_due: agent.total_approved_amount - agent.total_fees_collected,
      }));

      // Sort by total approved amount
      agentStatsArray.sort((a, b) => b.total_approved_amount - a.total_approved_amount);

      setAgentStats(agentStatsArray);

      // Calculate totals
      const calculatedTotals = agentStatsArray.reduce(
        (acc, agent) => ({
          totalOrders: acc.totalOrders + agent.total_orders,
          totalApproved: acc.totalApproved + agent.approved_orders,
          totalRejected: acc.totalRejected + agent.rejected_orders,
          totalPending: acc.totalPending + agent.pending_orders,
          totalApprovedAmount: acc.totalApprovedAmount + agent.total_approved_amount,
          totalRejectedAmount: acc.totalRejectedAmount + agent.total_rejected_amount,
          totalPendingAmount: acc.totalPendingAmount + agent.total_pending_amount,
          totalFees: acc.totalFees + agent.total_fees_collected,
          totalNetDue: acc.totalNetDue + agent.net_due,
        }),
        {
          totalOrders: 0,
          totalApproved: 0,
          totalRejected: 0,
          totalPending: 0,
          totalApprovedAmount: 0,
          totalRejectedAmount: 0,
          totalPendingAmount: 0,
          totalFees: 0,
          totalNetDue: 0,
        }
      );

      setTotals(calculatedTotals);
    } catch (err: any) {
      console.error('Error fetching agent stats:', err);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في جلب إحصائيات الوكلاء',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ar-DZ') + ' د.ج';
  };

  const exportToCSV = () => {
    const headers = [
      'اسم الوكيل',
      'رقم الهاتف',
      'إجمالي الطلبات',
      'الطلبات المقبولة',
      'الطلبات المرفوضة',
      'المبلغ المشحون',
      'الرسوم المحصلة',
      'المستحق للوكيل',
    ];

    const rows = agentStats.map(agent => [
      agent.agent_name,
      agent.agent_phone,
      agent.total_orders,
      agent.approved_orders,
      agent.rejected_orders,
      agent.total_approved_amount,
      agent.total_fees_collected,
      agent.net_due,
    ]);

    // Add totals row
    rows.push([
      'الإجمالي',
      '',
      totals.totalOrders,
      totals.totalApproved,
      totals.totalRejected,
      totals.totalApprovedAmount,
      totals.totalFees,
      totals.totalNetDue,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `agent-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: 'تم التصدير',
      description: 'تم تصدير التقرير بنجاح',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            محاسبة الوكلاء
          </h2>
          <p className="text-muted-foreground text-sm">
            تتبع أداء الوكلاء وحساب المستحقات المالية
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="w-4 h-4 ml-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateRanges.map(range => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={exportToCSV} disabled={agentStats.length === 0}>
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المشحون</p>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(totals.totalApprovedAmount)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">الرسوم المحصلة</p>
                <p className="text-xl font-bold text-green-500">
                  {formatCurrency(totals.totalFees)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">المستحق للوكلاء</p>
                <p className="text-xl font-bold text-orange-500">
                  {formatCurrency(totals.totalNetDue)}
                </p>
              </div>
              <Users className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">الطلبات المعالجة</p>
                <p className="text-xl font-bold">
                  {totals.totalApproved} / {totals.totalOrders}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الوكلاء</CardTitle>
          <CardDescription>
            إحصائيات كل وكيل والمبالغ المستحقة له
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : agentStats.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">لا توجد بيانات</h3>
              <p className="text-muted-foreground">
                لم يتم العثور على طلبات معالجة في هذه الفترة
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الوكيل</TableHead>
                    <TableHead className="text-center">الطلبات</TableHead>
                    <TableHead className="text-center">
                      <span className="text-green-500">مقبولة</span>
                    </TableHead>
                    <TableHead className="text-center">
                      <span className="text-red-500">مرفوضة</span>
                    </TableHead>
                    <TableHead className="text-center">المبلغ المشحون</TableHead>
                    <TableHead className="text-center">الرسوم</TableHead>
                    <TableHead className="text-center">
                      <span className="text-orange-500 font-bold">المستحق</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentStats.map(agent => (
                    <TableRow key={agent.agent_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{agent.agent_name}</p>
                          <p className="text-sm text-muted-foreground" dir="ltr">
                            {agent.agent_phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{agent.total_orders}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-500 font-medium">
                          {agent.approved_orders}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-red-500 font-medium">
                          {agent.rejected_orders}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {formatCurrency(agent.total_approved_amount)}
                      </TableCell>
                      <TableCell className="text-center text-green-500">
                        {formatCurrency(agent.total_fees_collected)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-orange-500 font-bold text-lg">
                          {formatCurrency(agent.net_due)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>الإجمالي</TableCell>
                    <TableCell className="text-center">
                      <Badge>{totals.totalOrders}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-green-500">
                      {totals.totalApproved}
                    </TableCell>
                    <TableCell className="text-center text-red-500">
                      {totals.totalRejected}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatCurrency(totals.totalApprovedAmount)}
                    </TableCell>
                    <TableCell className="text-center text-green-500">
                      {formatCurrency(totals.totalFees)}
                    </TableCell>
                    <TableCell className="text-center text-orange-500 text-lg">
                      {formatCurrency(totals.totalNetDue)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h4 className="font-medium text-blue-500 mb-1">طريقة الحساب</h4>
              <p className="text-sm text-muted-foreground">
                <strong>المستحق للوكيل</strong> = إجمالي المبالغ المشحونة (المقبولة فقط) - الرسوم المحصلة
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                هذا المبلغ يمثل ما يجب دفعه للوكيل مقابل الرصيد الذي استخدمه في شحن حسابات العملاء.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentAccountingReport;
