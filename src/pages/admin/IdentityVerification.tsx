import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useVerificationRequests, VerificationRequest } from '@/hooks/useVerificationRequests';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertCircle, CheckCircle, Clock, Eye, Shield, XCircle,
  FileText, Search, ZoomIn, ChevronLeft, ChevronRight, AlertTriangle, 
  Image, SkullIcon, Ban
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminAlertBanner } from '@/components/AdminAlertBanner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

const QUICK_REJECT_REASONS = [
  'صورة الهوية غير واضحة أو مقطوعة',
  'البيانات غير مطابقة للحساب',
  'صورة مأخوذة من شاشة هاتف آخر',
  'هوية منتهية الصلاحية',
  'محاولة احتيال - هوية مزورة أو مكررة',
  'يرجى رفع صورة جديدة بجودة أفضل',
];

export default function IdentityVerificationPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const { 
    requests, loading: requestsLoading, approveRequest, rejectRequest,
    page, setPage, totalCount, totalPages
  } = useVerificationRequests();
  const { toast } = useToast();
  
  const [selectedRequest, setSelectedRequest] = React.useState<VerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [processing, setProcessing] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageLoading, setImageLoading] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [rejectTarget, setRejectTarget] = React.useState<VerificationRequest | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = React.useState(false);
  const [imageZoom, setImageZoom] = React.useState(100);

  React.useEffect(() => {
    if (!rolesLoading && !isAdmin) {
      toast({ title: "غير مصرح", description: "ليس لديك صلاحية للوصول", variant: "destructive" });
      navigate('/admin');
    }
  }, [isAdmin, rolesLoading, navigate, toast]);

  const getSignedImageUrl = async (imagePath: string | null): Promise<string | null> => {
    if (!imagePath) return null;
    let path = imagePath;
    if (imagePath.startsWith('http')) {
      const pos = imagePath.indexOf('identity-documents/');
      if (pos !== -1) path = imagePath.substring(pos + 'identity-documents/'.length);
      else return imagePath;
    }
    try {
      const { data, error } = await supabase.storage.from('identity-documents').createSignedUrl(path, 3600);
      return error || !data?.signedUrl ? null : data.signedUrl;
    } catch { return null; }
  };

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return supabase.storage.from('identity-documents').getPublicUrl(imagePath).data.publicUrl;
  };

  const handleImagePreview = async (imagePath: string | null) => {
    if (!imagePath) return;
    setImageLoading(true);
    setImageError(false);
    setImageZoom(100);
    const signedUrl = await getSignedImageUrl(imagePath);
    if (signedUrl) setImagePreview(signedUrl);
    else { setImageError(true); setImageLoading(false); }
  };

  const handleImageError = async (e: React.SyntheticEvent<HTMLImageElement>, imagePath: string | null) => {
    const target = e.currentTarget;
    if (!imagePath || target.dataset.retried === 'true') { target.style.display = 'none'; return; }
    target.dataset.retried = 'true';
    let path = imagePath;
    if (imagePath.startsWith('http')) {
      const pos = imagePath.indexOf('identity-documents/');
      if (pos !== -1) path = imagePath.substring(pos + 'identity-documents/'.length);
      else { target.style.display = 'none'; return; }
    }
    try {
      const { data, error } = await supabase.storage.from('identity-documents').createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) target.style.display = 'none';
      else target.src = data.signedUrl;
    } catch { target.style.display = 'none'; }
  };

  const handleApprove = async (requestId: string) => {
    setProcessing(true);
    const result = await approveRequest(requestId);
    if (result.error) toast({ title: "خطأ", description: result.error, variant: "destructive" });
    else {
      toast({ title: "✅ تم الموافقة", description: "تم تفعيل الحساب بنجاح", duration: 3000 });
      if (selectedRequest?.id === requestId) setSelectedRequest(null);
    }
    setProcessing(false);
  };

  const handleReject = async (requestId: string, reason: string) => {
    if (!reason.trim()) { toast({ title: "خطأ", description: "يجب إدخال سبب الرفض", variant: "destructive" }); return; }
    setProcessing(true);
    const result = await rejectRequest(requestId, reason);
    if (result.error) toast({ title: "خطأ", description: result.error, variant: "destructive" });
    else {
      toast({ title: "تم الرفض", description: "تم رفض طلب التحقق" });
      setRejectionReason('');
      setRejectDialogOpen(false);
      setRejectTarget(null);
      if (selectedRequest?.id === requestId) setSelectedRequest(null);
    }
    setProcessing(false);
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    let success = 0, fail = 0;
    for (const id of selectedIds) {
      const result = await approveRequest(id);
      if (result.error) fail++; else success++;
    }
    toast({ title: `تمت المعالجة`, description: `✅ ${success} موافقة | ❌ ${fail} فشل` });
    setSelectedIds(new Set());
    setBulkProcessing(false);
  };

  const openRejectDialog = (request: VerificationRequest) => {
    setRejectTarget(request);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pendingIds = filteredRequests.filter(r => r.status === 'pending').map(r => r.id);
    if (pendingIds.every(id => selectedIds.has(id))) setSelectedIds(new Set());
    else setSelectedIds(new Set(pendingIds));
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('ar-DZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getDuplicateCount = (request: VerificationRequest) => request.duplicates?.reduce((sum, d) => sum + d.count, 0) || 0;
  const hasDuplicates = (request: VerificationRequest) => getDuplicateCount(request) > 0;
  const hasNameMismatch = (request: VerificationRequest) => request.full_name && request.full_name !== request.profiles?.full_name;

  if (rolesLoading || requestsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-12 bg-muted rounded" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;
  const duplicateCount = requests.filter(r => hasDuplicates(r) && r.status === 'pending').length;

  const filteredRequests = requests.filter(request => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      request.profiles?.full_name?.toLowerCase().includes(q) ||
      request.national_id.includes(searchTerm) ||
      request.profiles?.phone?.includes(searchTerm) ||
      request.full_name?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-3 md:p-6 space-y-4 max-w-[1600px] mx-auto">
      <AdminAlertBanner />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" />
            التحقق من الهوية
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{totalCount} طلب إجمالي</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="اسم، رقم هوية، هاتف..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pr-10 h-9 text-sm" />
          </div>
        </div>
      </div>

      {/* Fraud Alert Banner */}
      {duplicateCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-destructive/10 border-2 border-destructive/30 rounded-lg animate-pulse">
          <div className="p-2 bg-destructive/20 rounded-full">
            <SkullIcon className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-bold text-destructive">⚠️ تنبيه احتيال: {duplicateCount} طلب مشبوه يتطلب مراجعة فورية!</p>
            <p className="text-xs text-destructive/80">تم اكتشاف تكرارات في أرقام الهوية أو الأسماء أو الصور - قد يكون محاولة تلاعب</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={statusFilter} onValueChange={v => { setStatusFilter(v); setSelectedIds(new Set()); }}>
        <TabsList className="h-9">
          <TabsTrigger value="all" className="text-xs gap-1 px-3">الكل <Badge variant="secondary" className="text-xs px-1.5 py-0">{requests.length}</Badge></TabsTrigger>
          <TabsTrigger value="pending" className="text-xs gap-1 px-3">
            <Clock className="h-3 w-3" /> معلق <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-yellow-100 text-yellow-800">{pendingCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-xs gap-1 px-3">
            <CheckCircle className="h-3 w-3" /> موافق <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-green-100 text-green-800">{approvedCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs gap-1 px-3">
            <XCircle className="h-3 w-3" /> مرفوض <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-red-100 text-red-800">{rejectedCount}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-2 bg-primary/5 border border-primary/20 rounded-lg mt-3">
            <span className="text-sm font-medium">تم تحديد {selectedIds.size} طلب</span>
            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={handleBulkApprove} disabled={bulkProcessing}>
              <CheckCircle className="h-3 w-3 ml-1" /> موافقة جماعية
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>إلغاء</Button>
          </div>
        )}

        <TabsContent value={statusFilter} className="mt-3">
          <div className="flex gap-4">
            {/* Main Table */}
            <div className={`flex-1 min-w-0 ${selectedRequest ? 'hidden lg:block lg:flex-[0_0_55%]' : ''}`}>
              <Card className="border">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        {(statusFilter === 'all' || statusFilter === 'pending') && (
                          <TableHead className="w-10">
                            <Checkbox checked={filteredRequests.filter(r => r.status === 'pending').length > 0 && filteredRequests.filter(r => r.status === 'pending').every(r => selectedIds.has(r.id))} onCheckedChange={toggleSelectAll} />
                          </TableHead>
                        )}
                        <TableHead className="text-right text-xs">المستخدم</TableHead>
                        <TableHead className="text-right text-xs">رقم الهوية</TableHead>
                        <TableHead className="text-right text-xs">التاريخ</TableHead>
                        <TableHead className="text-right text-xs">الحالة</TableHead>
                        <TableHead className="text-right text-xs">تنبيهات</TableHead>
                        <TableHead className="text-right text-xs">إجراء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">{searchTerm ? 'لا توجد نتائج' : 'لا توجد طلبات'}</p>
                          </TableCell>
                        </TableRow>
                      ) : filteredRequests.map(request => {
                        const isDuplicate = hasDuplicates(request);
                        const isNameMismatch = hasNameMismatch(request);
                        const isSelected = selectedRequest?.id === request.id;
                        
                        return (
                          <TableRow 
                            key={request.id} 
                            className={`cursor-pointer transition-colors text-sm ${
                              isSelected ? 'bg-primary/10 border-r-2 border-r-primary' : 
                              isDuplicate && request.status === 'pending' ? 'bg-destructive/5 hover:bg-destructive/10' : 
                              'hover:bg-muted/50'
                            }`}
                            onClick={() => setSelectedRequest(request)}
                          >
                            {(statusFilter === 'all' || statusFilter === 'pending') && (
                              <TableCell onClick={e => e.stopPropagation()}>
                                {request.status === 'pending' && (
                                  <Checkbox checked={selectedIds.has(request.id)} onCheckedChange={() => toggleSelect(request.id)} />
                                )}
                              </TableCell>
                            )}
                            <TableCell>
                              <div>
                                <p className="font-medium text-xs">{request.profiles?.full_name || 'غير محدد'}</p>
                                <p className="text-xs text-muted-foreground">{request.profiles?.phone || ''}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{request.national_id}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(request.submitted_at)}</TableCell>
                            <TableCell>
                              {request.status === 'pending' && <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"><Clock className="h-3 w-3 ml-1" />معلق</Badge>}
                              {request.status === 'approved' && <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><CheckCircle className="h-3 w-3 ml-1" />موافق</Badge>}
                              {request.status === 'rejected' && <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 ml-1" />مرفوض</Badge>}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {isDuplicate && (
                                  <Badge variant="destructive" className="text-xs gap-0.5 animate-pulse">
                                    <Ban className="h-3 w-3" />
                                    {getDuplicateCount(request)} تكرار
                                  </Badge>
                                )}
                                {isNameMismatch && (
                                  <Badge variant="outline" className="text-xs gap-0.5 border-yellow-500 text-yellow-700">
                                    <AlertTriangle className="h-3 w-3" />
                                    اسم مختلف
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell onClick={e => e.stopPropagation()}>
                              {request.status === 'pending' && (
                                <div className="flex items-center gap-1">
                                  <Button size="sm" className="h-7 text-xs px-2 bg-green-600 hover:bg-green-700" onClick={() => handleApprove(request.id)} disabled={processing}>
                                    <CheckCircle className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => openRejectDialog(request)} disabled={processing}>
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className="text-muted-foreground">{((page - 1) * 20) + 1}-{Math.min(page * 20, totalCount)} من {totalCount}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronRight className="h-3 w-3" /> السابق
                    </Button>
                    <span className="px-2 text-muted-foreground">{page}/{totalPages}</span>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      التالي <ChevronLeft className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Side Panel */}
            {selectedRequest && (
              <div className="flex-1 lg:flex-[0_0_45%] min-w-0">
                <Card className="border sticky top-4">
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    <div className="p-4 space-y-4">
                      {/* Panel Header */}
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          تفاصيل الطلب
                        </h3>
                        <Button variant="ghost" size="sm" className="h-7 text-xs lg:hidden" onClick={() => setSelectedRequest(null)}>
                          إغلاق ✕
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs hidden lg:flex" onClick={() => setSelectedRequest(null)}>
                          ✕
                        </Button>
                      </div>

                      {/* Fraud Alerts in Panel */}
                      {hasDuplicates(selectedRequest) && (
                        <div className="p-3 bg-destructive/10 border-2 border-destructive rounded-lg space-y-2">
                          <h4 className="text-sm font-bold text-destructive flex items-center gap-2">
                            <SkullIcon className="h-4 w-4" />
                            🚨 تحذير: محاولة تلاعب محتملة!
                          </h4>
                          <p className="text-xs text-destructive/80">
                            هذا المستخدم يحاول التحقق بمعلومات مستخدمة سابقاً. قد يكون يحاول إنشاء حسابات متعددة للتلاعب بالنظام.
                          </p>
                          {selectedRequest.duplicates?.map((dup, idx) => (
                            <div key={idx} className="p-2 bg-destructive/5 rounded border border-destructive/20">
                              <p className="text-xs font-bold text-destructive mb-1">
                                {dup.type === 'national_id' && '🆔 رقم الهوية مستخدم من قبل!'}
                                {dup.type === 'name' && '👤 نفس الاسم مسجل سابقاً!'}
                                {dup.type === 'front_image' && '📷 نفس صورة الوجه الأمامي!'}
                                {dup.type === 'back_image' && '📷 نفس صورة الوجه الخلفي!'}
                                {' '}({dup.count} حساب آخر)
                              </p>
                              {dup.users.map((u, i) => (
                                <div key={i} className="text-xs flex items-center justify-between bg-background/50 px-2 py-1 rounded mt-1">
                                  <span>{u.full_name || 'غير محدد'} {u.phone && `• ${u.phone}`}</span>
                                  <Badge variant={u.status === 'approved' ? 'default' : u.status === 'rejected' ? 'destructive' : 'secondary'} className="text-xs">
                                    {u.status === 'approved' ? 'موافق' : u.status === 'rejected' ? 'مرفوض' : 'معلق'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ))}
                          <div className="p-2 bg-destructive/20 rounded text-xs font-bold text-destructive text-center">
                            ⛔ يُنصح بشدة برفض هذا الطلب والتحقيق في النشاط المشبوه
                          </div>
                        </div>
                      )}

                      {/* Name Mismatch Alert */}
                      {hasNameMismatch(selectedRequest) && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-300 dark:border-yellow-800 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                            <div className="text-xs">
                              <p className="font-bold text-yellow-800 dark:text-yellow-300">⚠️ عدم تطابق الاسم</p>
                              <p className="text-yellow-700 dark:text-yellow-400 mt-1">
                                الحساب: <strong>{selectedRequest.profiles?.full_name}</strong>
                              </p>
                              <p className="text-yellow-700 dark:text-yellow-400">
                                البطاقة: <strong className="text-destructive">{selectedRequest.full_name}</strong>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* User Info */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground block">الاسم</span>
                          <span className="font-medium">{selectedRequest.profiles?.full_name || 'غير محدد'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">الهاتف</span>
                          <span className="font-medium">{selectedRequest.profiles?.phone || 'غير محدد'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">رقم الهوية</span>
                          <span className="font-mono font-medium">{selectedRequest.national_id}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">تاريخ الطلب</span>
                          <span className="font-medium">{formatDate(selectedRequest.submitted_at)}</span>
                        </div>
                        {selectedRequest.full_name && (
                          <div>
                            <span className="text-muted-foreground block">الاسم على البطاقة</span>
                            <span className={`font-medium ${selectedRequest.full_name === selectedRequest.profiles?.full_name ? 'text-green-600' : 'text-destructive'}`}>
                              {selectedRequest.full_name}
                            </span>
                          </div>
                        )}
                        {selectedRequest.date_of_birth && (
                          <div>
                            <span className="text-muted-foreground block">تاريخ الميلاد</span>
                            <span className="font-medium">{new Date(selectedRequest.date_of_birth).toLocaleDateString('ar-DZ')}</span>
                          </div>
                        )}
                        {selectedRequest.place_of_birth && (
                          <div>
                            <span className="text-muted-foreground block">مكان الميلاد</span>
                            <span className="font-medium">{selectedRequest.place_of_birth}</span>
                          </div>
                        )}
                        {selectedRequest.address && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground block">العنوان</span>
                            <span className="font-medium">{selectedRequest.address}</span>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* ID Images */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold flex items-center gap-1">
                          <Image className="h-3.5 w-3.5" /> صور الهوية
                        </h4>
                        {(selectedRequest.id_front_image || selectedRequest.id_back_image) ? (
                          <div className="grid grid-cols-2 gap-2">
                            {selectedRequest.id_front_image && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">أمامي</p>
                                <div className="relative group cursor-pointer" onClick={() => handleImagePreview(selectedRequest.id_front_image)}>
                                  <img src={getImageUrl(selectedRequest.id_front_image) || ''} alt="أمامي" loading="lazy"
                                    className="w-full h-28 object-cover rounded border bg-muted group-hover:brightness-75 transition"
                                    onError={e => handleImageError(e, selectedRequest.id_front_image)} />
                                  <ZoomIn className="h-5 w-5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition" />
                                </div>
                              </div>
                            )}
                            {selectedRequest.id_back_image && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">خلفي</p>
                                <div className="relative group cursor-pointer" onClick={() => handleImagePreview(selectedRequest.id_back_image)}>
                                  <img src={getImageUrl(selectedRequest.id_back_image) || ''} alt="خلفي" loading="lazy"
                                    className="w-full h-28 object-cover rounded border bg-muted group-hover:brightness-75 transition"
                                    onError={e => handleImageError(e, selectedRequest.id_back_image)} />
                                  <ZoomIn className="h-5 w-5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition" />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6 bg-muted/30 rounded border border-dashed text-xs text-muted-foreground">
                            لم يتم رفع صور
                          </div>
                        )}
                      </div>

                      {/* Rejection reason display */}
                      {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                        <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                          <p className="text-xs font-semibold text-destructive mb-1">سبب الرفض:</p>
                          <p className="text-xs text-destructive/80">{selectedRequest.rejection_reason}</p>
                        </div>
                      )}

                      {/* Quick Actions */}
                      {selectedRequest.status === 'pending' && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Button className="flex-1 h-9 text-sm bg-green-600 hover:bg-green-700" onClick={() => handleApprove(selectedRequest.id)} disabled={processing}>
                                <CheckCircle className="h-4 w-4 ml-1" /> موافقة
                              </Button>
                              <Button variant="destructive" className="flex-1 h-9 text-sm" onClick={() => openRejectDialog(selectedRequest)} disabled={processing}>
                                <XCircle className="h-4 w-4 ml-1" /> رفض
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog with Quick Reasons */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              رفض طلب {rejectTarget?.profiles?.full_name}
            </DialogTitle>
            <DialogDescription>اختر سبباً جاهزاً أو اكتب سبباً مخصصاً</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REJECT_REASONS.map((reason, i) => (
                <Button key={i} variant={rejectionReason === reason ? 'default' : 'outline'} size="sm" className="text-xs h-7"
                  onClick={() => setRejectionReason(reason)}>
                  {reason}
                </Button>
              ))}
            </div>
            <Textarea placeholder="أو اكتب سبباً مخصصاً..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={2} className="text-sm" />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => rejectTarget && handleReject(rejectTarget.id, rejectionReason)} disabled={processing || !rejectionReason.trim()}>
              رفض الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!imagePreview} onOpenChange={() => { setImagePreview(null); setImageLoading(false); setImageError(false); }}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>معاينة الصورة</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setImageZoom(z => Math.max(50, z - 25))}>−</Button>
                <span className="text-xs w-12 text-center">{imageZoom}%</span>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setImageZoom(z => Math.min(400, z + 25))}>+</Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="relative min-h-[200px] flex items-center justify-center overflow-auto max-h-[75vh]">
            {imagePreview && !imageError && (
              <>
                {imageLoading && <div className="absolute inset-0 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>}
                <img src={imagePreview} alt="معاينة" className="max-w-none transition-transform"
                  style={{ width: `${imageZoom}%`, display: imageLoading ? 'none' : 'block' }}
                  onLoad={() => setImageLoading(false)} onError={() => { setImageLoading(false); setImageError(true); }} />
              </>
            )}
            {imageError && (
              <div className="text-center py-8">
                <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" />
                <p className="text-sm font-medium">فشل تحميل الصورة</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
