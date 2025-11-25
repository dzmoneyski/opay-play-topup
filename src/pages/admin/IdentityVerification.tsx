import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useVerificationRequests } from '@/hooks/useVerificationRequests';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, Eye, Shield, XCircle, Phone, Calendar, FileText, Search, ZoomIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminAlertBanner } from '@/components/AdminAlertBanner';

export default function IdentityVerificationPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const { requests, loading: requestsLoading, approveRequest, rejectRequest } = useVerificationRequests();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = React.useState<any>(null);
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [processing, setProcessing] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false);
  const [requestToReview, setRequestToReview] = React.useState<any>(null);
  const [imageLoading, setImageLoading] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

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

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    const { data } = supabase.storage.from('identity-documents').getPublicUrl(imagePath);
    return data.publicUrl;
  };

  const getSignedImageUrl = async (imagePath: string | null): Promise<string | null> => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) {
      // Extract path from full URL
      const pos = imagePath.indexOf('identity-documents/');
      if (pos !== -1) {
        imagePath = imagePath.substring(pos + 'identity-documents/'.length);
      } else {
        return imagePath;
      }
    }
    
    try {
      const { data, error } = await supabase.storage
        .from('identity-documents')
        .createSignedUrl(imagePath, 3600);
      
      if (error || !data?.signedUrl) {
        console.error('Error creating signed URL:', error);
        return null;
      }
      
      return data.signedUrl;
    } catch (err) {
      console.error('Exception creating signed URL:', err);
      return null;
    }
  };

  const handleImagePreview = async (imagePath: string | null) => {
    if (!imagePath) return;
    setImageLoading(true);
    setImageError(false);
    
    const signedUrl = await getSignedImageUrl(imagePath);
    if (signedUrl) {
      setImagePreview(signedUrl);
      setImageLoading(false);
    } else {
      setImageError(true);
      setImageLoading(false);
    }
  };

  const handleImageError = async (
    e: React.SyntheticEvent<HTMLImageElement, Event>,
    imagePath: string | null
  ) => {
    const target = e.currentTarget;
    if (!imagePath) return;
    if (target.dataset.retried === 'true') {
      target.style.display = 'none';
      return;
    }
    target.dataset.retried = 'true';

    let path = imagePath;
    if (imagePath.startsWith('http')) {
      const pos = imagePath.indexOf('identity-documents/');
      if (pos !== -1) {
        path = imagePath.substring(pos + 'identity-documents/'.length);
      } else {
        target.style.display = 'none';
        return;
      }
    }

    try {
      const { data, error } = await supabase.storage
        .from('identity-documents')
        .createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) {
        target.style.display = 'none';
        return;
      }
      target.src = data.signedUrl;
    } catch (err) {
      target.style.display = 'none';
    }
  };

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
    }
    setProcessing(false);
  };

  const handleReject = async (requestId: string, reason: string) => {
    if (!reason.trim()) {
      toast({
        title: "خطأ",
        description: "يجب إدخال سبب الرفض",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    const result = await rejectRequest(requestId, reason);
    
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
      setRejectionReason('');
      setSelectedRequest(null);
    }
    setProcessing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            <Clock className="w-3 h-3" />
            قيد المراجعة
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const approvedRequests = requests.filter(req => req.status === 'approved').length;
  const rejectedRequests = requests.filter(req => req.status === 'rejected').length;

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
      {/* Alert Banner */}
      <AdminAlertBanner />
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">التحقق من الهوية</h1>
          <p className="text-sm text-muted-foreground mt-1">
            مراجعة وإدارة طلبات التحقق
          </p>
        </div>
        
        {/* Search Bar */}
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

      {/* Tabs with Stats */}
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
              <span className="font-semibold text-yellow-600">{pendingRequests.length}</span>
            </div>
            <span className="text-xs">قيد المراجعة</span>
          </TabsTrigger>
          
          <TabsTrigger value="approved" className="flex flex-col items-center gap-1 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-green-600">{approvedRequests}</span>
            </div>
            <span className="text-xs">موافق عليها</span>
          </TabsTrigger>
          
          <TabsTrigger value="rejected" className="flex flex-col items-center gap-1 py-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="font-semibold text-red-600">{rejectedRequests}</span>
            </div>
            <span className="text-xs">مرفوضة</span>
          </TabsTrigger>
        </TabsList>

        {/* Requests List */}
        <TabsContent value={statusFilter} className="mt-4 space-y-4">
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  {searchTerm ? 'لا توجد نتائج' : 'لا توجد طلبات'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchTerm ? 'جرب البحث بكلمات مختلفة' : 'لم يتم تقديم أي طلبات حتى الآن'}
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

                      {/* Information Comparison - Compact */}
                      {request.full_name_on_id && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                          <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            مقارنة المعلومات
                          </h4>
                          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">الحساب:</span>
                              <span className="font-medium">{request.profiles?.full_name || 'غير محدد'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">البطاقة:</span>
                              <span className={`font-medium ${
                                request.full_name_on_id === request.profiles?.full_name 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                {request.full_name_on_id}
                              </span>
                            </div>
                            {request.date_of_birth && (
                              <>
                                <span className="text-muted-foreground">تاريخ الميلاد:</span>
                                <span className="font-medium">{new Date(request.date_of_birth).toLocaleDateString('ar-DZ')}</span>
                              </>
                            )}
                            {request.place_of_birth && (
                              <>
                                <span className="text-muted-foreground">مكان الميلاد:</span>
                                <span className="font-medium">{request.place_of_birth}</span>
                              </>
                            )}
                          </div>
                          {request.address && (
                            <div className="mt-2 pt-2 border-t text-xs">
                              <span className="text-muted-foreground">العنوان: </span>
                              <span className="font-medium">{request.address}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Duplicate Warnings */}
                      {request.duplicates && request.duplicates.length > 0 && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 border-2 border-red-500 rounded-lg space-y-2">
                          <h4 className="text-sm font-bold text-red-800 dark:text-red-300 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            ⚠️ تحذير: تكرارات مكتشفة
                          </h4>
                          {request.duplicates.map((duplicate, idx) => (
                            <div key={idx} className="p-2 bg-red-100 dark:bg-red-900/20 rounded border border-red-300 dark:border-red-700">
                              <p className="text-xs font-semibold text-red-900 dark:text-red-200 mb-1">
                                {duplicate.type === 'national_id' && '🆔 رقم البطاقة الوطنية مستخدم من قبل'}
                                {duplicate.type === 'name' && '👤 الاسم الكامل مستخدم من قبل'}
                                {duplicate.type === 'front_image' && '📷 صورة الوجه الأمامي مستخدمة من قبل'}
                                {duplicate.type === 'back_image' && '📷 صورة الوجه الخلفي مستخدمة من قبل'}
                                <span className="mr-1 font-bold">({duplicate.count} حساب)</span>
                              </p>
                              <div className="space-y-1 mt-2">
                                {duplicate.users.map((user, userIdx) => (
                                  <div key={userIdx} className="text-xs text-red-800 dark:text-red-300 flex items-center justify-between bg-white/50 dark:bg-black/20 px-2 py-1 rounded">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{user.full_name || 'غير محدد'}</span>
                                      {user.phone && (
                                        <span className="text-red-600 dark:text-red-400">• {user.phone}</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs">
                                        {new Date(user.submitted_at).toLocaleDateString('ar-DZ')}
                                      </span>
                                      <Badge 
                                        variant={
                                          user.status === 'approved' ? 'default' : 
                                          user.status === 'rejected' ? 'destructive' : 
                                          'secondary'
                                        }
                                        className="text-xs"
                                      >
                                        {user.status === 'approved' && 'موافق'}
                                        {user.status === 'rejected' && 'مرفوض'}
                                        {user.status === 'pending' && 'معلق'}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-red-700 dark:text-red-400 mt-2 font-medium">
                                ⚠️ يرجى التحقق من أن هذا ليس حساباً مكرراً قبل الموافقة
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Identity Documents with Preview */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <FileText className="h-4 w-4" />
                      صور الهوية الوطنية
                    </h4>
                    
                    {(request.national_id_front_image || request.national_id_back_image) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {request.national_id_front_image && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">الوجه الأمامي</p>
                            <div className="relative group">
                              <img 
                                src={getImageUrl(request.national_id_front_image) || ''} 
                                alt="الوجه الأمامي"
                                className="w-full h-32 object-cover rounded-lg border bg-muted cursor-pointer transition-transform group-hover:scale-[1.02]"
                                onClick={() => handleImagePreview(request.national_id_front_image)}
                                onError={(e) => handleImageError(e, request.national_id_front_image)}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {request.national_id_back_image && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">الوجه الخلفي</p>
                            <div className="relative group">
                              <img 
                                src={getImageUrl(request.national_id_back_image) || ''} 
                                alt="الوجه الخلفي"
                                className="w-full h-32 object-cover rounded-lg border bg-muted cursor-pointer transition-transform group-hover:scale-[1.02]"
                                onClick={() => handleImagePreview(request.national_id_back_image)}
                                onError={(e) => handleImageError(e, request.national_id_back_image)}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
                        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">لم يتم رفع صور للهوية</p>
                      </div>
                    )}
                  </div>
                  
                  <Separator className="my-4" />

                  {/* Action Buttons */}
                  {request.status === 'pending' && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={() => {
                          setRequestToReview(request);
                          setReviewDialogOpen(true);
                        }}
                        variant="outline"
                        className="flex-1"
                        size="sm"
                      >
                        <Eye className="w-4 h-4 ml-2" />
                        معاينة الطلب
                      </Button>
                      
                      <Button
                        onClick={() => handleApprove(request.id)}
                        disabled={processing}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 ml-2" />
                        موافقة
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            onClick={() => setSelectedRequest(request)}
                            className="flex-1"
                            size="sm"
                          >
                            <XCircle className="w-4 h-4 ml-2" />
                            رفض
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>رفض طلب التحقق</DialogTitle>
                            <DialogDescription>
                              يرجى إدخال سبب رفض طلب التحقق من الهوية لـ {request.profiles?.full_name}
                            </DialogDescription>
                          </DialogHeader>
                          <Textarea
                            placeholder="سبب الرفض (مثال: صورة الهوية غير واضحة، بيانات غير مطابقة، إلخ)"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="mt-4"
                            rows={3}
                          />
                          <DialogFooter>
                            <Button
                              variant="destructive"
                              onClick={() => selectedRequest && handleReject(selectedRequest.id, rejectionReason)}
                              disabled={processing || !rejectionReason.trim()}
                            >
                              رفض الطلب
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                  
                  {/* Rejection Reason Display */}
                  {request.status === 'rejected' && request.rejection_reason && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
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
      
      {/* Review Request Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Shield className="h-6 w-6" />
              معاينة طلب التحقق
            </DialogTitle>
            <DialogDescription>
              مراجعة تفاصيل الطلب قبل اتخاذ القرار
            </DialogDescription>
          </DialogHeader>
          
           {!requestToReview ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground">جاري تحميل البيانات...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* User Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">معلومات المستخدم</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">الاسم الكامل</p>
                    <p className="font-medium">{requestToReview.profiles?.full_name || 'غير محدد'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                    <p className="font-medium">{requestToReview.profiles?.phone || 'غير محدد'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                    <p className="font-medium">{requestToReview.profiles?.email || 'غير محدد'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">تاريخ تقديم الطلب</p>
                    <p className="font-medium">{formatDate(requestToReview.submitted_at)}</p>
                  </div>
                </div>
              </div>

              {/* ID Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">معلومات الهوية الوطنية</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الهوية الوطنية</p>
                    <p className="font-medium text-lg">{requestToReview.national_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الاسم الكامل على البطاقة</p>
                    <p className={`font-medium ${
                      requestToReview.full_name_on_id === requestToReview.profiles?.full_name 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {requestToReview.full_name_on_id || 'غير محدد'}
                    </p>
                  </div>
                  {requestToReview.date_of_birth && (
                    <div>
                      <p className="text-sm text-muted-foreground">تاريخ الميلاد</p>
                      <p className="font-medium">{new Date(requestToReview.date_of_birth).toLocaleDateString('ar-DZ')}</p>
                    </div>
                  )}
                  {requestToReview.place_of_birth && (
                    <div>
                      <p className="text-sm text-muted-foreground">مكان الميلاد</p>
                      <p className="font-medium">{requestToReview.place_of_birth}</p>
                    </div>
                  )}
                  {requestToReview.address && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">العنوان</p>
                      <p className="font-medium">{requestToReview.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Name Comparison Alert */}
              {requestToReview.full_name_on_id && requestToReview.full_name_on_id !== requestToReview.profiles?.full_name && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-900">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-900 dark:text-yellow-300">تنبيه: عدم تطابق الاسم</p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-400 mt-1">
                        الاسم في الحساب ({requestToReview.profiles?.full_name}) لا يطابق الاسم على البطاقة ({requestToReview.full_name_on_id})
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ID Images */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">صور الهوية الوطنية</h3>
                {(requestToReview.national_id_front_image || requestToReview.national_id_back_image) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {requestToReview.national_id_front_image && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">الوجه الأمامي</p>
                        <div 
                          className="relative group cursor-pointer"
                          onClick={() => handleImagePreview(requestToReview.national_id_front_image)}
                        >
                          <img 
                            src={getImageUrl(requestToReview.national_id_front_image) || ''} 
                            alt="الوجه الأمامي"
                            className="w-full h-48 object-cover rounded-lg border bg-muted transition-transform group-hover:scale-[1.02]"
                            onError={(e) => handleImageError(e, requestToReview.national_id_front_image)}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                            <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {requestToReview.national_id_back_image && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">الوجه الخلفي</p>
                        <div 
                          className="relative group cursor-pointer"
                          onClick={() => handleImagePreview(requestToReview.national_id_back_image)}
                        >
                          <img 
                            src={getImageUrl(requestToReview.national_id_back_image) || ''} 
                            alt="الوجه الخلفي"
                            className="w-full h-48 object-cover rounded-lg border bg-muted transition-transform group-hover:scale-[1.02]"
                            onError={(e) => handleImageError(e, requestToReview.national_id_back_image)}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                            <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">لم يتم رفع صور للهوية</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <Separator />
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => {
                    handleApprove(requestToReview.id);
                    setReviewDialogOpen(false);
                  }}
                  disabled={processing}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 ml-2" />
                  الموافقة على الطلب
                </Button>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      onClick={() => setSelectedRequest(requestToReview)}
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 ml-2" />
                      رفض الطلب
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>رفض طلب التحقق</DialogTitle>
                      <DialogDescription>
                        يرجى إدخال سبب رفض طلب التحقق من الهوية لـ {requestToReview.profiles?.full_name}
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      placeholder="سبب الرفض (مثال: صورة الهوية غير واضحة، بيانات غير مطابقة، إلخ)"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="mt-4"
                      rows={3}
                    />
                    <DialogFooter>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          handleReject(requestToReview.id, rejectionReason);
                          setReviewDialogOpen(false);
                        }}
                        disabled={processing || !rejectionReason.trim()}
                      >
                        رفض الطلب
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!imagePreview} onOpenChange={() => {
        setImagePreview(null);
        setImageLoading(false);
        setImageError(false);
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>معاينة الصورة</DialogTitle>
          </DialogHeader>
          <div className="relative min-h-[200px] flex items-center justify-center">
            {imagePreview && !imageError && (
              <>
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                )}
                <img 
                  src={imagePreview} 
                  alt="معاينة" 
                  className="w-full h-auto max-h-[70vh] object-contain"
                  onLoad={() => setImageLoading(false)}
                  onLoadStart={() => setImageLoading(true)}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                  style={{ display: imageLoading ? 'none' : 'block' }}
                />
              </>
            )}
            {imageError && (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">فشل تحميل الصورة</p>
                <p className="text-sm text-muted-foreground">يرجى المحاولة مرة أخرى</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
