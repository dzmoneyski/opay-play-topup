import { useState, useEffect } from 'react';
import { Users, Calendar, TrendingUp, DollarSign, CheckCircle, Loader2, Download, Banknote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ServiceStats {
  total_orders: number;
  approved_orders: number;
  rejected_orders: number;
  pending_orders: number;
  total_approved_amount: number;
  total_rejected_amount: number;
  total_pending_amount: number;
  total_fees_collected: number;
}

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
  net_due: number;
  total_settled: number;
  phone_topup: ServiceStats;
  game_topup: ServiceStats;
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
  const { user } = useAuth();
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
    totalSettled: 0,
  });

  // Settlement dialog state
  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);
  const [settlementAgent, setSettlementAgent] = useState<AgentStats | null>(null);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');
  const [settlementSaving, setSettlementSaving] = useState(false);

  const dateRanges = getDateRanges();

  useEffect(() => {
    fetchAgentStats();
  }, [selectedPeriod]);

  const createEmptyServiceStats = (): ServiceStats => ({
    total_orders: 0,
    approved_orders: 0,
    rejected_orders: 0,
    pending_orders: 0,
    total_approved_amount: 0,
    total_rejected_amount: 0,
    total_pending_amount: 0,
    total_fees_collected: 0,
  });

  const fetchAgentStats = async () => {
    setLoading(true);
    try {
      const range = dateRanges.find(r => r.value === selectedPeriod);
      if (!range) return;

      let phoneQuery = supabase
        .from('phone_topup_orders')
        .select('*, phone_operators(fee_type, fee_value, fee_min, fee_max)')
        .not('processed_by', 'is', null);

      let gameQuery = supabase
        .from('game_topup_orders')
        .select('*')
        .not('processed_by', 'is', null);

      if (selectedPeriod !== 'all') {
        phoneQuery = phoneQuery
          .gte('processed_at', range.startDate.toISOString())
          .lte('processed_at', range.endDate.toISOString());
        gameQuery = gameQuery
          .gte('processed_at', range.startDate.toISOString())
          .lte('processed_at', range.endDate.toISOString());
      }

      const [phoneResult, gameResult, settlementsResult] = await Promise.all([
        phoneQuery,
        gameQuery,
        supabase.from('agent_settlements').select('agent_id, amount'),
      ]);

      if (phoneResult.error) throw phoneResult.error;
      if (gameResult.error) throw gameResult.error;

      const phoneOrders = phoneResult.data || [];
      const gameOrders = gameResult.data || [];
      const settlements = settlementsResult.data || [];

      // Build settlements map (all-time, not filtered by period)
      const settlementsMap = new Map<string, number>();
      for (const s of settlements) {
        settlementsMap.set(s.agent_id, (settlementsMap.get(s.agent_id) || 0) + Number(s.amount));
      }

      const calculateFee = (amount: number, operator: any): number => {
        if (!operator) return 0;
        const { fee_type, fee_value, fee_min, fee_max } = operator;
        let fee = fee_type === 'percentage' ? (amount * fee_value) / 100 : fee_value;
        if (fee < fee_min) fee = fee_min;
        if (fee_max && fee > fee_max) fee = fee_max;
        return fee;
      };

      const allAgentIds = [
        ...new Set([
          ...phoneOrders.map(o => o.processed_by).filter(Boolean),
          ...gameOrders.map(o => o.processed_by).filter(Boolean)
        ])
      ];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', allAgentIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const statsMap = new Map<string, AgentStats>();

      const getOrCreateAgent = (agentId: string): AgentStats => {
        if (!statsMap.has(agentId)) {
          const profile = profilesMap.get(agentId);
          statsMap.set(agentId, {
            agent_id: agentId,
            agent_name: profile?.full_name || 'غير معروف',
            agent_phone: profile?.phone || '',
            total_orders: 0, approved_orders: 0, rejected_orders: 0, pending_orders: 0,
            total_approved_amount: 0, total_rejected_amount: 0, total_pending_amount: 0,
            total_fees_collected: 0, net_due: 0, total_settled: 0,
            phone_topup: createEmptyServiceStats(),
            game_topup: createEmptyServiceStats(),
          });
        }
        return statsMap.get(agentId)!;
      };

      for (const order of phoneOrders) {
        if (!order.processed_by) continue;
        const stats = getOrCreateAgent(order.processed_by);
        stats.phone_topup.total_orders++;
        stats.total_orders++;

        if (order.status === 'approved') {
          stats.phone_topup.approved_orders++;
          stats.approved_orders++;
          stats.phone_topup.total_approved_amount += order.amount || 0;
          stats.total_approved_amount += order.amount || 0;
          const calculatedFee = order.fee_amount > 0 
            ? order.fee_amount 
            : calculateFee(order.amount, order.phone_operators);
          stats.phone_topup.total_fees_collected += calculatedFee;
          stats.total_fees_collected += calculatedFee;
        } else if (order.status === 'rejected') {
          stats.phone_topup.rejected_orders++;
          stats.rejected_orders++;
          stats.phone_topup.total_rejected_amount += order.amount || 0;
          stats.total_rejected_amount += order.amount || 0;
        } else if (order.status === 'pending') {
          stats.phone_topup.pending_orders++;
          stats.pending_orders++;
          stats.phone_topup.total_pending_amount += order.amount || 0;
          stats.total_pending_amount += order.amount || 0;
        }
      }

      for (const order of gameOrders) {
        if (!order.processed_by) continue;
        const stats = getOrCreateAgent(order.processed_by);
        stats.game_topup.total_orders++;
        stats.total_orders++;

        if (order.status === 'approved' || order.status === 'completed') {
          stats.game_topup.approved_orders++;
          stats.approved_orders++;
          stats.game_topup.total_approved_amount += order.amount || 0;
          stats.total_approved_amount += order.amount || 0;
        } else if (order.status === 'rejected') {
          stats.game_topup.rejected_orders++;
          stats.rejected_orders++;
          stats.game_topup.total_rejected_amount += order.amount || 0;
          stats.total_rejected_amount += order.amount || 0;
        } else if (order.status === 'pending') {
          stats.game_topup.pending_orders++;
          stats.pending_orders++;
          stats.game_topup.total_pending_amount += order.amount || 0;
          stats.total_pending_amount += order.amount || 0;
        }
      }

      const agentStatsArray = Array.from(statsMap.values()).map(agent => {
        const settled = settlementsMap.get(agent.agent_id) || 0;
        return {
          ...agent,
          total_settled: settled,
          net_due: agent.total_approved_amount + agent.total_fees_collected - settled,
        };
      });

      agentStatsArray.sort((a, b) => b.total_approved_amount - a.total_approved_amount);
      setAgentStats(agentStatsArray);

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
          totalSettled: acc.totalSettled + agent.total_settled,
        }),
        {
          totalOrders: 0, totalApproved: 0, totalRejected: 0, totalPending: 0,
          totalApprovedAmount: 0, totalRejectedAmount: 0, totalPendingAmount: 0,
          totalFees: 0, totalNetDue: 0, totalSettled: 0,
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

  const handleSettlement = async () => {
    if (!settlementAgent || !user) return;
    const amount = Number(settlementAmount);
    if (!amount || amount <= 0) {
      toast({ title: 'خطأ', description: 'أدخل مبلغاً صحيحاً', variant: 'destructive' });
      return;
    }

    setSettlementSaving(true);
    try {
      const { error } = await supabase.from('agent_settlements').insert({
        agent_id: settlementAgent.agent_id,
        amount,
        notes: settlementNotes || null,
        settled_by: user.id,
      });

      if (error) throw error;

      toast({ title: 'تم بنجاح', description: `تم تسجيل تسوية بمبلغ ${Math.round(amount)} د.ج` });
      setSettlementDialogOpen(false);
      setSettlementAgent(null);
      setSettlementAmount('');
      setSettlementNotes('');
      fetchAgentStats();
    } catch (err) {
      console.error('Error creating settlement:', err);
      toast({ title: 'خطأ', description: 'فشل في تسجيل التسوية', variant: 'destructive' });
    } finally {
      setSettlementSaving(false);
    }
  };

  const openSettlementDialog = (agent: AgentStats) => {
    setSettlementAgent(agent);
    setSettlementAmount(String(Math.max(0, Math.round(agent.net_due))));
    setSettlementNotes('');
    setSettlementDialogOpen(true);
  };

  const formatCurrency = (amount: number) => Math.round(amount) + ' د.ج';

  const exportToCSV = () => {
    const headers = [
      'اسم الوكيل', 'رقم الهاتف', 'إجمالي الطلبات', 'الطلبات المقبولة',
      'الطلبات المرفوضة', 'المبلغ المشحون', 'الرسوم المحصلة', 'المُسوّى', 'المستحق للوكيل',
      'طلبات الهاتف', 'طلبات الألعاب',
    ];

    const rows = agentStats.map(agent => [
      agent.agent_name, agent.agent_phone, agent.total_orders, agent.approved_orders,
      agent.rejected_orders, agent.total_approved_amount, agent.total_fees_collected,
      agent.total_settled, agent.net_due, agent.phone_topup.approved_orders, agent.game_topup.approved_orders,
    ]);

    rows.push([
      'الإجمالي', '', totals.totalOrders, totals.totalApproved, totals.totalRejected,
      totals.totalApprovedAmount, totals.totalFees, totals.totalSettled, totals.totalNetDue,
      agentStats.reduce((sum, a) => sum + a.phone_topup.approved_orders, 0),
      agentStats.reduce((sum, a) => sum + a.game_topup.approved_orders, 0),
    ] as any);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `agent-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'تم التصدير', description: 'تم تصدير التقرير بنجاح' });
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                <p className="text-sm text-muted-foreground">المُسوّى (مدفوع)</p>
                <p className="text-xl font-bold text-blue-500">
                  {formatCurrency(totals.totalSettled)}
                </p>
              </div>
              <Banknote className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">المستحق المتبقي</p>
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
          <CardDescription>إحصائيات كل وكيل والمبالغ المستحقة له</CardDescription>
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
              <p className="text-muted-foreground">لم يتم العثور على طلبات معالجة في هذه الفترة</p>
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
                    <TableHead className="text-center">📱 هاتف</TableHead>
                    <TableHead className="text-center">🎮 ألعاب</TableHead>
                    <TableHead className="text-center">المبلغ المشحون</TableHead>
                    <TableHead className="text-center">الرسوم</TableHead>
                    <TableHead className="text-center">المُسوّى</TableHead>
                    <TableHead className="text-center">
                      <span className="text-orange-500 font-bold">المتبقي</span>
                    </TableHead>
                    <TableHead className="text-center">تسوية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentStats.map(agent => (
                    <TableRow key={agent.agent_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{agent.agent_name}</p>
                          <p className="text-sm text-muted-foreground" dir="ltr">{agent.agent_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{agent.total_orders}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-500 font-medium">{agent.approved_orders}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-red-500 font-medium">{agent.rejected_orders}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-blue-500 font-medium">{agent.phone_topup.approved_orders}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-purple-500 font-medium">{agent.game_topup.approved_orders}</span>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {formatCurrency(agent.total_approved_amount)}
                      </TableCell>
                      <TableCell className="text-center text-green-500">
                        {formatCurrency(agent.total_fees_collected)}
                      </TableCell>
                      <TableCell className="text-center text-blue-500">
                        {formatCurrency(agent.total_settled)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold text-lg ${agent.net_due > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                          {formatCurrency(agent.net_due)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openSettlementDialog(agent)}
                          disabled={agent.net_due <= 0}
                          className="gap-1"
                        >
                          <Banknote className="w-4 h-4" />
                          تسوية
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>الإجمالي</TableCell>
                    <TableCell className="text-center">
                      <Badge>{totals.totalOrders}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-green-500">{totals.totalApproved}</TableCell>
                    <TableCell className="text-center text-red-500">{totals.totalRejected}</TableCell>
                    <TableCell className="text-center text-blue-500">
                      {agentStats.reduce((sum, a) => sum + a.phone_topup.approved_orders, 0)}
                    </TableCell>
                    <TableCell className="text-center text-purple-500">
                      {agentStats.reduce((sum, a) => sum + a.game_topup.approved_orders, 0)}
                    </TableCell>
                    <TableCell className="text-center">{formatCurrency(totals.totalApprovedAmount)}</TableCell>
                    <TableCell className="text-center text-green-500">{formatCurrency(totals.totalFees)}</TableCell>
                    <TableCell className="text-center text-blue-500">{formatCurrency(totals.totalSettled)}</TableCell>
                    <TableCell className="text-center text-orange-500 text-lg">{formatCurrency(totals.totalNetDue)}</TableCell>
                    <TableCell></TableCell>
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
                <strong>المتبقي للوكيل</strong> = (المبالغ المشحونة + الرسوم المحصلة) - المبالغ المُسوّاة
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                عند دفع مستحقات الوكيل نقداً، سجّل التسوية لتصفير المستحق.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settlement Dialog */}
      <Dialog open={settlementDialogOpen} onOpenChange={setSettlementDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تسجيل تسوية - {settlementAgent?.agent_name}</DialogTitle>
            <DialogDescription>
              سجّل المبلغ الذي دفعته نقداً للوكيل
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {settlementAgent && (
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المستحق الكلي:</span>
                  <span className="font-bold">
                    {formatCurrency(settlementAgent.total_approved_amount + settlementAgent.total_fees_collected)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المُسوّى سابقاً:</span>
                  <span className="text-blue-500 font-medium">{formatCurrency(settlementAgent.total_settled)}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-muted-foreground">المتبقي:</span>
                  <span className="text-orange-500 font-bold">{formatCurrency(settlementAgent.net_due)}</span>
                </div>
              </div>
            )}

            <div>
              <Label>المبلغ المدفوع (د.ج)</Label>
              <Input
                type="number"
                placeholder="أدخل المبلغ"
                value={settlementAmount}
                onChange={(e) => setSettlementAmount(e.target.value)}
              />
            </div>

            <div>
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                placeholder="مثال: دفعة نقدية بتاريخ..."
                value={settlementNotes}
                onChange={(e) => setSettlementNotes(e.target.value)}
              />
            </div>

            <Button onClick={handleSettlement} disabled={settlementSaving} className="w-full gap-2">
              {settlementSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
              تأكيد التسوية
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentAccountingReport;
