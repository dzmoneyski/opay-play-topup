import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useVerificationRequests } from '@/hooks/useVerificationRequests';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, Eye, Shield, XCircle, Phone, Calendar, FileText, Search, ZoomIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminAlertBanner } from '@/components/AdminAlertBanner';

/**
 * صفحة التحقق من الهوية للمشرفين
 * 
 * الوظائف الرئيسية:
 * 1. عرض قائمة طلبات التحقق من الهوية
 * 2. البحث والتصفية حسب الحالة
 * 3. قبول أو رفض الطلبات مباشرة
 * 4. معاينة تفاصيل الطلب كاملة
 * 
 * الأزرار:
 * - "معاينة الطلب": يفتح نافذة كبيرة تعرض جميع التفاصيل والصور
 * - "موافقة": يوافق على الطلب مباشرة بدون نافذة
 * - "رفض": يفتح نافذة صغيرة لإدخال سبب الرفض
 */
export default function IdentityVerificationPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const { requests, loading: requestsLoading, approveRequest, rejectRequest } = useVerificationRequests();
  const { toast } = useToast();

  // الحالات (States)
  const [selectedRequest, setSelectedRequest] = React.useState<any>(null); // الطلب المختار للرفض
  const [rejectionReason, setRejectionReason] = React.useState(''); // سبب الرفض
  const [processing, setProcessing] = React.useState(false); // حالة المعالجة
  const [searchTerm, setSearchTerm] = React.useState(''); // كلمة البحث
  const [statusFilter, setStatusFilter] = React.useState('all'); // فلتر الحالة
  
  // حالات المعاينة
  const [previewRequest, setPreviewRequest] = React.useState<any>(null); // الطلب المعاين
  const [imagePreview, setImagePreview] = React.useState<string | null>(null); // معاينة صورة مكبرة
  const [showRejectDialog, setShowRejectDialog] = React.useState(false); // إظهار نافذة الرفض

  // التحقق من صلاحيات المشرف
  React.useEffect(() => {
    if (!rolesLoading && !isAdmin) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية للوصول إلى هذه الصفحة",
        variant: "destructive"
      });
      navigate('/admin');
    }
  }, [isAdmin, rolesLoading, navigate, toast]);

  /**
   * الحصول على رابط الصورة
   * يحول المسار إلى رابط كامل للعرض
   */
  const getImageUrl = async (imagePath: string | null): Promise<string | null> => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    
    try {
      const { data, error } = await supabase.storage
        .from('identity-documents')
        .createSignedUrl(imagePath, 3600); // صالح لمدة ساعة
      
      if (error || !data?.signedUrl) {
        console.error('خطأ في إنشاء رابط الصورة:', error);
        return null;
      }
      
      return data.signedUrl;
    } catch (err) {
      console.error('خطأ:', err);
      return null;
    }
  };

  /**
   * معالجة الموافقة على الطلب
   * يتم استدعاؤها عند الضغط على زر "موافقة"
   */
  const handleApprove = async (requestId: string) => {
    setProcessing(true);
    const result = await approveRequest(requestId);
    
    if (result.error) {
      toast({
        title: "خطأ",
        description: result.error,
        variant: "destructive"
      });
    } else {
      toast({
        title: "✅ تم الموافقة على التحقق",
        description: "⚠️ يجب تفعيل الحساب يدوياً في صفحة المستخدمين لتفعيل الإحالات",
        duration: 6000,
      });
      // إغلاق نافذة المعاينة إن كانت مفتوحة
      setPreviewRequest(null);
    }
    setProcessing(false);
  };

  /**
   * معالجة رفض الطلب
   * يتم استدعاؤها عند تأكيد الرفض في نافذة الرفض
   */
  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast({
        title: "خطأ",
        description: "يجب إدخال سبب الرفض",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    const result = await rejectRequest(selectedRequest.id, rejectionReason);
    
    if (result.error) {
      toast({
        title: "خطأ",
        description: result.error,
        variant: "destructive"
      });
    } else {
      toast({
        title: "تم بنجاح",
        description: "تم رفض طلب التحقق",
      });
      // إغلاق النوافذ وإعادة تعيين الحالات
      setRejectionReason('');
      setSelectedRequest(null);
      setShowRejectDialog(false);
      setPreviewRequest(null);
    }
    setProcessing(false);
  };

  /**
   * فتح معاينة صورة مكبرة
   */
  const openImagePreview = async (imagePath: string | null) => {
    if (!imagePath) return;
    const url = await getImageUrl(imagePath);
    if (url) setImagePreview(url);
  };

  /**
   * الحصول على شارة الحالة
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            قيد المراجعة
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            موافق عليه
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            مرفوض
          </Badge>
        );
      default:
        return null;
    }
  };

  /**
   * تنسيق التاريخ
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // حالة التحميل
  if (rolesLoading || requestsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // إحصائيات الطلبات
  const pendingCount = requests.filter(req => req.status === 'pending').length;
  const approvedCount = requests.filter(req => req.status === 'approved').length;
  const rejectedCount = requests.filter(req => req.status === 'rejected').length;

  // تصفية الطلبات حسب البحث والحالة
  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.national_id.includes(searchTerm) ||
      request.profiles?.phone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <AdminAlertBanner />
      
      {/* العنوان وشريط البحث */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">التحقق من الهوية</h1>
          <p className="text-sm text-muted-foreground mt-1">
            مراجعة وإدارة طلبات التحقق
          </p>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ابحث بالاسم، رقم الهوية أو الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* التبويبات مع الإحصائيات */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          <TabsTrigger value="all" className="flex flex-col items-center gap-1 py-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="font-semibold">{requests.length}</span>
            </div>
            <span className="text-xs">الكل</span>
          </TabsTrigger>
          
          <TabsTrigger value="pending" className="flex flex-col items-center gap-1 py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="font-semibold text-yellow-600">{pendingCount}</span>
            </div>
            <span className="text-xs">قيد المراجعة</span>
          </TabsTrigger>
          
          <TabsTrigger value="approved" className="flex flex-col items-center gap-1 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-green-600">{approvedCount}</span>
            </div>
            <span className="text-xs">موافق عليها</span>
          </TabsTrigger>
          
          <TabsTrigger value="rejected" className="flex flex-col items-center gap-1 py-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="font-semibold text-red-600">{rejectedCount}</span>
            </div>
            <span className="text-xs">مرفوضة</span>
          </TabsTrigger>
        </TabsList>

        {/* قائمة الطلبات */}
        <TabsContent value={statusFilter} className="mt-4 space-y-4">
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  {searchTerm ? 'لا توجد نتائج' : 'لا توجد طلبات'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => (
              <Card 
                key={request.id} 
                className={`transition-all hover:shadow-md ${
                  request.status === 'pending' ? 'border-r-4 border-r-yellow-500' : 
                  request.status === 'approved' ? 'border-r-4 border-r-green-500' :
                  'border-r-4 border-r-red-500'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{request.profiles?.full_name || 'اسم غير محدد'}</CardTitle>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          {request.national_id}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {request.profiles?.phone || 'غير محدد'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(request.submitted_at)}
                        </span>
                      </div>

                      {/* مقارنة المعلومات */}
                      {request.full_name_on_id && (
                        <div className="mt-3 p-4 bg-muted/50 rounded-lg border">
                          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            مقارنة المعلومات
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-background rounded border">
                              <span className="font-medium text-sm">{request.profiles?.full_name || 'غير محدد'}</span>
                              <span className="text-xs text-muted-foreground">الاسم في الحساب</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-background rounded border">
                              <span className={`font-medium text-sm ${
                                request.full_name_on_id === request.profiles?.full_name 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {request.full_name_on_id}
                              </span>
                              <span className="text-xs text-muted-foreground">الاسم على البطاقة</span>
                            </div>
                            {request.full_name_on_id !== request.profiles?.full_name && (
                              <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded">
                                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                <span>الأسماء غير متطابقة - يرجى التحقق بعناية</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* تحذيرات التكرار */}
                      {request.duplicates && request.duplicates.length > 0 && (
                        <div className="mt-3 p-4 bg-red-50 dark:bg-red-950/30 border-2 border-red-500 rounded-lg space-y-3">
                          <h4 className="text-sm font-bold text-red-800 dark:text-red-300 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            ⚠️ تحذير: تكرارات مكتشفة ({request.duplicates.length})
                          </h4>
                          <div className="space-y-2">
                            {request.duplicates.map((duplicate: any, idx: number) => (
                              <div key={idx} className="p-3 bg-red-100/50 dark:bg-red-900/20 rounded-lg border border-red-300 dark:border-red-700 space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                                    {duplicate.type === 'national_id' && '🆔 رقم البطاقة الوطنية'}
                                    {duplicate.type === 'name' && '👤 الاسم الكامل'}
                                    {duplicate.type === 'front_image' && '📷 الصورة الأمامية'}
                                    {duplicate.type === 'back_image' && '📷 الصورة الخلفية'}
                                  </p>
                                  <Badge variant="destructive" className="text-xs">
                                    {duplicate.count} حساب مكرر
                                  </Badge>
                                </div>
                                <div className="space-y-1">
                                  {duplicate.users.slice(0, 3).map((user: any, userIdx: number) => (
                                    <div key={userIdx} className="text-xs text-red-800 dark:text-red-300 flex items-center justify-between bg-white/60 dark:bg-black/30 px-3 py-2 rounded border border-red-200 dark:border-red-800">
                                      <div className="flex items-center gap-2 flex-1">
                                        <span className="font-medium">{user.full_name || 'غير محدد'}</span>
                                        {user.phone && (
                                          <span className="text-red-600 dark:text-red-400">• {user.phone}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(user.submitted_at).toLocaleDateString('ar-DZ', { month: 'short', day: 'numeric' })}
                                        </span>
                                        <Badge 
                                          variant={
                                            user.status === 'approved' ? 'default' : 
                                            user.status === 'rejected' ? 'destructive' : 
                                            'secondary'
                                          }
                                          className="text-xs"
                                        >
                                          {user.status === 'approved' && '✓ موافق'}
                                          {user.status === 'rejected' && '✗ مرفوض'}
                                          {user.status === 'pending' && '○ معلق'}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                  {duplicate.users.length > 3 && (
                                    <p className="text-xs text-red-700 dark:text-red-400 text-center py-1">
                                      ... و {duplicate.users.length - 3} حساب آخر
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-start gap-2 p-3 bg-red-200/50 dark:bg-red-900/40 rounded border border-red-400">
                            <AlertCircle className="h-4 w-4 text-red-800 dark:text-red-300 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-red-800 dark:text-red-300 font-medium">
                              يرجى التحقق من أن هذا ليس حساباً مكرراً قبل الموافقة. في حالة الشك، يُفضل رفض الطلب.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  {/* الصور المصغرة */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      صور الهوية الوطنية
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {request.national_id_front_image && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">📄 الوجه الأمامي</p>
                          <div 
                            className="relative group cursor-pointer overflow-hidden rounded-lg border-2 border-border hover:border-primary transition-colors"
                            onClick={() => openImagePreview(request.national_id_front_image)}
                          >
                            <img 
                              src={`https://zxnwixjdwimfblcwfkgo.supabase.co/storage/v1/object/public/identity-documents/${request.national_id_front_image}`}
                              alt="الوجه الأمامي"
                              className="w-full h-32 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                              <div className="transform scale-0 group-hover:scale-100 transition-transform duration-200 bg-white rounded-full p-2">
                                <ZoomIn className="h-5 w-5 text-primary" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {request.national_id_back_image && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">📄 الوجه الخلفي</p>
                          <div 
                            className="relative group cursor-pointer overflow-hidden rounded-lg border-2 border-border hover:border-primary transition-colors"
                            onClick={() => openImagePreview(request.national_id_back_image)}
                          >
                            <img 
                              src={`https://zxnwixjdwimfblcwfkgo.supabase.co/storage/v1/object/public/identity-documents/${request.national_id_back_image}`}
                              alt="الوجه الخلفي"
                              className="w-full h-32 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                              <div className="transform scale-0 group-hover:scale-100 transition-transform duration-200 bg-white rounded-full p-2">
                                <ZoomIn className="h-5 w-5 text-primary" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Separator />

                  {/* أزرار الإجراءات */}
                  {request.status === 'pending' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Button
                        onClick={() => setPreviewRequest(request)}
                        variant="outline"
                        className="w-full border-2 hover:border-primary hover:bg-primary/5"
                        size="default"
                      >
                        <Eye className="w-4 h-4 ml-2" />
                        معاينة كاملة
                      </Button>
                      
                      <Button
                        onClick={() => handleApprove(request.id)}
                        disabled={processing}
                        className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white shadow-sm"
                        size="default"
                      >
                        <CheckCircle className="w-4 h-4 ml-2" />
                        {processing ? 'جاري...' : 'موافقة'}
                      </Button>
                      
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRejectDialog(true);
                        }}
                        className="w-full shadow-sm"
                        size="default"
                        disabled={processing}
                      >
                        <XCircle className="w-4 h-4 ml-2" />
                        رفض
                      </Button>
                    </div>
                  )}
                  
                  {/* عرض سبب الرفض */}
                  {request.status === 'rejected' && request.rejection_reason && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200">
                      <p className="text-xs font-semibold text-red-900 dark:text-red-300 mb-1">سبب الرفض:</p>
                      <p className="text-sm text-red-800 dark:text-red-400">{request.rejection_reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
      
      {/* نافذة المعاينة الكاملة */}
      <Dialog open={!!previewRequest} onOpenChange={(open) => !open && setPreviewRequest(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Shield className="h-6 w-6" />
              معاينة طلب التحقق
            </DialogTitle>
            <DialogDescription>
              مراجعة جميع تفاصيل الطلب قبل اتخاذ القرار
            </DialogDescription>
          </DialogHeader>
          
          {previewRequest && (
            <div className="space-y-6">
              {/* معلومات المستخدم */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">معلومات المستخدم</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">الاسم الكامل</p>
                    <p className="font-medium">{previewRequest.profiles?.full_name || 'غير محدد'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                    <p className="font-medium">{previewRequest.profiles?.phone || 'غير محدد'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                    <p className="font-medium">{previewRequest.profiles?.email || 'غير محدد'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">تاريخ تقديم الطلب</p>
                    <p className="font-medium">{formatDate(previewRequest.submitted_at)}</p>
                  </div>
                </div>
              </div>

              {/* معلومات الهوية */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">معلومات الهوية الوطنية</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الهوية</p>
                    <p className="font-medium text-lg">{previewRequest.national_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الاسم على البطاقة</p>
                    <p className={`font-medium ${
                      previewRequest.full_name_on_id === previewRequest.profiles?.full_name 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {previewRequest.full_name_on_id || 'غير محدد'}
                    </p>
                  </div>
                  {previewRequest.date_of_birth && (
                    <div>
                      <p className="text-sm text-muted-foreground">تاريخ الميلاد</p>
                      <p className="font-medium">{new Date(previewRequest.date_of_birth).toLocaleDateString('ar-DZ')}</p>
                    </div>
                  )}
                  {previewRequest.place_of_birth && (
                    <div>
                      <p className="text-sm text-muted-foreground">مكان الميلاد</p>
                      <p className="font-medium">{previewRequest.place_of_birth}</p>
                    </div>
                  )}
                  {previewRequest.address && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">العنوان</p>
                      <p className="font-medium">{previewRequest.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* تنبيه عدم التطابق */}
              {previewRequest.full_name_on_id && previewRequest.full_name_on_id !== previewRequest.profiles?.full_name && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-900 dark:text-yellow-300">تنبيه: عدم تطابق الاسم</p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-400 mt-1">
                        الاسم في الحساب لا يطابق الاسم على البطاقة
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* الصور الكاملة */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">صور الهوية الوطنية</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {previewRequest.national_id_front_image && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">الوجه الأمامي</p>
                      <img 
                        src={`https://zxnwixjdwimfblcwfkgo.supabase.co/storage/v1/object/public/identity-documents/${previewRequest.national_id_front_image}`}
                        alt="الوجه الأمامي"
                        className="w-full h-64 object-cover rounded-lg border cursor-pointer"
                        onClick={() => openImagePreview(previewRequest.national_id_front_image)}
                      />
                    </div>
                  )}
                  
                  {previewRequest.national_id_back_image && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">الوجه الخلفي</p>
                      <img 
                        src={`https://zxnwixjdwimfblcwfkgo.supabase.co/storage/v1/object/public/identity-documents/${previewRequest.national_id_back_image}`}
                        alt="الوجه الخلفي"
                        className="w-full h-64 object-cover rounded-lg border cursor-pointer"
                        onClick={() => openImagePreview(previewRequest.national_id_back_image)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* أزرار الإجراءات في نافذة المعاينة */}
          <DialogFooter className="flex flex-row gap-2 justify-end sm:justify-end border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setPreviewRequest(null)}
              size="default"
            >
              إغلاق
            </Button>
            
            {previewRequest?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setSelectedRequest(previewRequest);
                    setShowRejectDialog(true);
                  }}
                  disabled={processing}
                  size="default"
                  className="shadow-sm"
                >
                  <XCircle className="w-4 h-4 ml-2" />
                  رفض الطلب
                </Button>
                
                <Button
                  onClick={() => handleApprove(previewRequest.id)}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white shadow-sm"
                  size="default"
                >
                  <CheckCircle className="w-4 h-4 ml-2" />
                  الموافقة على الطلب
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة الرفض */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-red-600 justify-end">
              رفض طلب التحقق
              <XCircle className="h-5 w-5" />
            </DialogTitle>
            <DialogDescription className="text-right">
              يرجى إدخال سبب الرفض ليتمكن المستخدم من معرفة المشكلة وتصحيحها
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="bg-muted/50 p-3 rounded-lg border text-right">
              <p className="text-sm font-semibold mb-1">معلومات الطلب:</p>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p>الاسم: <span className="font-medium text-foreground">{selectedRequest.profiles?.full_name || 'غير محدد'}</span></p>
                <p>رقم الهاتف: <span className="font-medium text-foreground">{selectedRequest.profiles?.phone || 'غير محدد'}</span></p>
                <p>رقم الهوية: <span className="font-medium text-foreground">{selectedRequest.national_id}</span></p>
              </div>
            </div>
          )}
          
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-right block">سبب الرفض *</label>
              <Textarea
                placeholder="مثال: الصورة غير واضحة، البيانات غير مطابقة، الاسم لا يطابق الهوية..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={5}
                className="text-right resize-none"
                dir="rtl"
              />
              <p className="text-xs text-muted-foreground text-right">
                سيتم إرسال هذا السبب للمستخدم لمعرفة المشكلة
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex flex-row gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason('');
                setSelectedRequest(null);
              }}
              disabled={processing}
              className="flex-1 sm:flex-initial"
            >
              إلغاء
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
              className="flex-1 sm:flex-initial"
            >
              {processing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  جاري الرفض...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 ml-2" />
                  تأكيد الرفض
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة معاينة الصورة المكبرة */}
      <Dialog open={!!imagePreview} onOpenChange={(open) => !open && setImagePreview(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>معاينة الصورة</DialogTitle>
          </DialogHeader>
          {imagePreview && (
            <img 
              src={imagePreview} 
              alt="معاينة" 
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
