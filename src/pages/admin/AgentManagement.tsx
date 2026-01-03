import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UserPlus, Settings2, Trash2, Shield, Gamepad2, Eye, Loader2, Smartphone } from 'lucide-react';

interface Agent {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  permissions: {
    id: string;
    can_manage_game_topups: boolean;
    can_manage_betting: boolean;
    can_manage_phone_topups: boolean;
    can_view_orders: boolean;
    daily_limit: number;
    notes: string | null;
  } | null;
}

interface NewAgentForm {
  phone: string;
  can_manage_game_topups: boolean;
  can_manage_betting: boolean;
  can_manage_phone_topups: boolean;
  can_view_orders: boolean;
  daily_limit: number;
  notes: string;
}

const AgentManagement = () => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);

  const [newAgentForm, setNewAgentForm] = useState<NewAgentForm>({
    phone: '',
    can_manage_game_topups: true,
    can_manage_betting: true,
    can_manage_phone_topups: true,
    can_view_orders: true,
    daily_limit: 100000,
    notes: ''
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      // Get all users with agent role
      const { data: agentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'agent');

      if (rolesError) throw rolesError;

      if (!agentRoles || agentRoles.length === 0) {
        setAgents([]);
        setLoading(false);
        return;
      }

      const agentUserIds = agentRoles.map(r => r.user_id);

      // Get profiles for these agents
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone')
        .in('user_id', agentUserIds);

      if (profilesError) throw profilesError;

      // Get permissions for these agents
      const { data: permissions, error: permError } = await supabase
        .from('agent_permissions')
        .select('*')
        .in('user_id', agentUserIds);

      if (permError) throw permError;

      // Combine data
      const agentsData: Agent[] = (profiles || []).map(profile => ({
        user_id: profile.user_id,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        permissions: permissions?.find(p => p.user_id === profile.user_id) || null
      }));

      setAgents(agentsData);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل بيانات الوكلاء",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addAgent = async () => {
    if (!newAgentForm.phone) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم الهاتف",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // Find user by phone
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('phone', newAgentForm.phone)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على مستخدم بهذا الرقم",
          variant: "destructive"
        });
        setSaving(false);
        return;
      }

      // Check if already an agent
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('role', 'agent')
        .maybeSingle();

      if (existingRole) {
        toast({
          title: "خطأ",
          description: "هذا المستخدم وكيل بالفعل",
          variant: "destructive"
        });
        setSaving(false);
        return;
      }

      // Add agent role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: profile.user_id, role: 'agent' });

      if (roleError) throw roleError;

      // Add permissions
      const { error: permError } = await supabase
        .from('agent_permissions')
        .insert({
          user_id: profile.user_id,
          can_manage_game_topups: newAgentForm.can_manage_game_topups,
          can_manage_betting: newAgentForm.can_manage_betting,
          can_manage_phone_topups: newAgentForm.can_manage_phone_topups,
          can_view_orders: newAgentForm.can_view_orders,
          daily_limit: newAgentForm.daily_limit,
          notes: newAgentForm.notes || null
        });

      if (permError) throw permError;

      toast({
        title: "تم بنجاح",
        description: `تم تعيين ${profile.full_name || 'المستخدم'} كوكيل`
      });

      setAddDialogOpen(false);
      setNewAgentForm({
        phone: '',
        can_manage_game_topups: true,
        can_manage_betting: true,
        can_manage_phone_topups: true,
        can_view_orders: true,
        daily_limit: 100000,
        notes: ''
      });
      fetchAgents();
    } catch (error) {
      console.error('Error adding agent:', error);
      toast({
        title: "خطأ",
        description: "فشل في إضافة الوكيل",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePermissions = async () => {
    if (!editingAgent || !editingAgent.permissions) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('agent_permissions')
        .update({
          can_manage_game_topups: editingAgent.permissions.can_manage_game_topups,
          can_manage_betting: editingAgent.permissions.can_manage_betting,
          can_manage_phone_topups: editingAgent.permissions.can_manage_phone_topups,
          can_view_orders: editingAgent.permissions.can_view_orders,
          daily_limit: editingAgent.permissions.daily_limit,
          notes: editingAgent.permissions.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingAgent.permissions.id);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم تحديث صلاحيات الوكيل"
      });

      setEditingAgent(null);
      fetchAgents();
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث الصلاحيات",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const removeAgent = async (agent: Agent) => {
    if (!confirm(`هل أنت متأكد من إزالة ${agent.full_name || 'الوكيل'} من الوكلاء؟`)) return;

    try {
      // Remove role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', agent.user_id)
        .eq('role', 'agent');

      if (roleError) throw roleError;

      // Remove permissions
      if (agent.permissions) {
        await supabase
          .from('agent_permissions')
          .delete()
          .eq('user_id', agent.user_id);
      }

      toast({
        title: "تم بنجاح",
        description: "تم إزالة الوكيل"
      });

      fetchAgents();
    } catch (error) {
      console.error('Error removing agent:', error);
      toast({
        title: "خطأ",
        description: "فشل في إزالة الوكيل",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الوكلاء</h1>
          <p className="text-muted-foreground">إدارة وكلاء خدمات الألعاب والمراهنات</p>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              إضافة وكيل
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة وكيل جديد</DialogTitle>
              <DialogDescription>
                أدخل رقم هاتف المستخدم لتعيينه كوكيل
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>رقم الهاتف</Label>
                <Input
                  placeholder="05xxxxxxxx"
                  value={newAgentForm.phone}
                  onChange={(e) => setNewAgentForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="space-y-3">
                <Label>الصلاحيات</Label>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="h-4 w-4 text-primary" />
                    <span className="text-sm">إدارة شحن الألعاب</span>
                  </div>
                  <Switch
                    checked={newAgentForm.can_manage_game_topups}
                    onCheckedChange={(checked) => setNewAgentForm(prev => ({ ...prev, can_manage_game_topups: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-warning" />
                    <span className="text-sm">إدارة المراهنات</span>
                  </div>
                  <Switch
                    checked={newAgentForm.can_manage_betting}
                    onCheckedChange={(checked) => setNewAgentForm(prev => ({ ...prev, can_manage_betting: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">إدارة شحن الهاتف</span>
                  </div>
                  <Switch
                    checked={newAgentForm.can_manage_phone_topups}
                    onCheckedChange={(checked) => setNewAgentForm(prev => ({ ...prev, can_manage_phone_topups: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">عرض جميع الطلبات</span>
                  </div>
                  <Switch
                    checked={newAgentForm.can_view_orders}
                    onCheckedChange={(checked) => setNewAgentForm(prev => ({ ...prev, can_view_orders: checked }))}
                  />
                </div>
              </div>

              <div>
                <Label>الحد اليومي (دج)</Label>
                <Input
                  type="number"
                  value={newAgentForm.daily_limit}
                  onChange={(e) => setNewAgentForm(prev => ({ ...prev, daily_limit: Number(e.target.value) }))}
                />
              </div>

              <div>
                <Label>ملاحظات</Label>
                <Textarea
                  placeholder="ملاحظات اختيارية..."
                  value={newAgentForm.notes}
                  onChange={(e) => setNewAgentForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <Button onClick={addAgent} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                إضافة الوكيل
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">لا يوجد وكلاء</h3>
            <p className="text-muted-foreground text-center mb-4">
              لم تقم بإضافة أي وكلاء بعد. أضف وكيلاً للبدء.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>الوكلاء ({agents.length})</CardTitle>
            <CardDescription>قائمة الوكلاء وصلاحياتهم</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الوكيل</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>الصلاحيات</TableHead>
                  <TableHead>الحد اليومي</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.user_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{agent.full_name || 'بدون اسم'}</p>
                        <p className="text-xs text-muted-foreground">{agent.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{agent.phone || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {agent.permissions?.can_manage_game_topups && (
                          <Badge variant="secondary" className="text-xs">ألعاب</Badge>
                        )}
                        {agent.permissions?.can_manage_betting && (
                          <Badge variant="secondary" className="text-xs">مراهنات</Badge>
                        )}
                        {agent.permissions?.can_manage_phone_topups && (
                          <Badge className="text-xs bg-blue-500">هاتف</Badge>
                        )}
                        {agent.permissions?.can_view_orders && (
                          <Badge variant="outline" className="text-xs">عرض</Badge>
                        )}
                        {!agent.permissions && (
                          <Badge variant="destructive" className="text-xs">بدون صلاحيات</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {agent.permissions?.daily_limit?.toLocaleString()} دج
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingAgent(agent)}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeAgent(agent)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Permissions Dialog */}
      <Dialog open={!!editingAgent} onOpenChange={(open) => !open && setEditingAgent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل صلاحيات {editingAgent?.full_name}</DialogTitle>
            <DialogDescription>
              قم بتعديل صلاحيات الوكيل حسب الحاجة
            </DialogDescription>
          </DialogHeader>

          {editingAgent?.permissions && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="h-4 w-4 text-primary" />
                    <span className="text-sm">إدارة شحن الألعاب</span>
                  </div>
                  <Switch
                    checked={editingAgent.permissions.can_manage_game_topups}
                    onCheckedChange={(checked) => setEditingAgent(prev => prev ? {
                      ...prev,
                      permissions: prev.permissions ? { ...prev.permissions, can_manage_game_topups: checked } : null
                    } : null)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-warning" />
                    <span className="text-sm">إدارة المراهنات</span>
                  </div>
                  <Switch
                    checked={editingAgent.permissions.can_manage_betting}
                    onCheckedChange={(checked) => setEditingAgent(prev => prev ? {
                      ...prev,
                      permissions: prev.permissions ? { ...prev.permissions, can_manage_betting: checked } : null
                    } : null)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">إدارة شحن الهاتف</span>
                  </div>
                  <Switch
                    checked={editingAgent.permissions.can_manage_phone_topups}
                    onCheckedChange={(checked) => setEditingAgent(prev => prev ? {
                      ...prev,
                      permissions: prev.permissions ? { ...prev.permissions, can_manage_phone_topups: checked } : null
                    } : null)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">عرض جميع الطلبات</span>
                  </div>
                  <Switch
                    checked={editingAgent.permissions.can_view_orders}
                    onCheckedChange={(checked) => setEditingAgent(prev => prev ? {
                      ...prev,
                      permissions: prev.permissions ? { ...prev.permissions, can_view_orders: checked } : null
                    } : null)}
                  />
                </div>
              </div>

              <div>
                <Label>الحد اليومي (دج)</Label>
                <Input
                  type="number"
                  value={editingAgent.permissions.daily_limit}
                  onChange={(e) => setEditingAgent(prev => prev ? {
                    ...prev,
                    permissions: prev.permissions ? { ...prev.permissions, daily_limit: Number(e.target.value) } : null
                  } : null)}
                />
              </div>

              <div>
                <Label>ملاحظات</Label>
                <Textarea
                  placeholder="ملاحظات اختيارية..."
                  value={editingAgent.permissions.notes || ''}
                  onChange={(e) => setEditingAgent(prev => prev ? {
                    ...prev,
                    permissions: prev.permissions ? { ...prev.permissions, notes: e.target.value } : null
                  } : null)}
                />
              </div>

              <Button onClick={updatePermissions} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                حفظ التغييرات
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentManagement;
