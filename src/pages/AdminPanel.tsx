import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useVerificationRequests } from '@/hooks/useVerificationRequests';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Clock, Eye, Shield, Users, XCircle, User, Phone, Calendar, FileText, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const { requests, loading: requestsLoading, approveRequest, rejectRequest } = useVerificationRequests();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = React.useState<any>(null);
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [processing, setProcessing] = React.useState(false);

  // Function to get image URL from Supabase Storage or return direct URL
  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    
    // If it's already a full URL, return it as is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Otherwise, construct the URL from storage
    const { data } = supabase.storage.from('identity-documents').getPublicUrl(imagePath);
    return data.publicUrl;
  };

  React.useEffect(() => {
    if (!rolesLoading && !isAdmin) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية للوصول إلى هذه الصفحة",
        variant: "destructive"
      });
      navigate('/dashboard');
    }
  }, [isAdmin, rolesLoading, navigate, toast]);

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
        title: "تم بنجاح",
        description: "تم الموافقة على طلب التحقق وتفعيل الحساب",
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
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (rolesLoading || requestsLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const totalRequests = requests.length;
  const approvedRequests = requests.filter(req => req.status === 'approved').length;
  const rejectedRequests = requests.filter(req => req.status === 'rejected').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 space-x-reverse hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>العودة</span>
              </Button>
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">لوحة الإدارة</h1>
                  <p className="text-gray-500 dark:text-gray-400">إدارة طلبات التحقق من الهوية</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRequests}</div>
              <p className="text-xs text-muted-foreground">جميع طلبات التحقق</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">قيد المراجعة</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</div>
              <p className="text-xs text-muted-foreground">تحتاج إلى مراجعة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">موافق عليها</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedRequests}</div>
              <p className="text-xs text-muted-foreground">تم قبولها</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">مرفوضة</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{rejectedRequests}</div>
              <p className="text-xs text-muted-foreground">تم رفضها</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-6">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                طلبات تحتاج مراجعة ({pendingRequests.length})
              </h2>
            </div>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="border-l-4 border-l-yellow-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>{request.profiles?.full_name || 'اسم غير محدد'}</span>
                        </CardTitle>
                        <CardDescription className="flex items-center space-x-4">
                          <span className="flex items-center space-x-1">
                            <FileText className="h-3 w-3" />
                            <span>رقم الهوية: {request.national_id}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{request.profiles?.phone || 'غير محدد'}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(request.submitted_at)}</span>
                          </span>
                        </CardDescription>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </CardHeader>
                   <CardContent>
                     {/* Display identity document images */}
                     <div className="mb-4">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {request.national_id_front_image && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">صورة الهوية - الوجه الأمامي</p>
                              <img 
                                src={getImageUrl(request.national_id_front_image) || ''} 
                                alt="الوجه الأمامي للهوية"
                                className="w-full max-h-48 object-contain border rounded-md bg-gray-50"
                                onClick={() => window.open(getImageUrl(request.national_id_front_image) || '', '_blank')}
                                style={{ cursor: 'pointer' }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden w-full max-h-48 border rounded-md bg-gray-50 flex items-center justify-center">
                                <p className="text-sm text-muted-foreground">فشل في تحميل الصورة</p>
                              </div>
                            </div>
                          )}
                          
                          {request.national_id_back_image && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">صورة الهوية - الوجه الخلفي</p>
                              <img 
                                src={getImageUrl(request.national_id_back_image) || ''} 
                                alt="الوجه الخلفي للهوية"
                                className="w-full max-h-48 object-contain border rounded-md bg-gray-50"
                                onClick={() => window.open(getImageUrl(request.national_id_back_image) || '', '_blank')}
                                style={{ cursor: 'pointer' }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden w-full max-h-48 border rounded-md bg-gray-50 flex items-center justify-center">
                                <p className="text-sm text-muted-foreground">فشل في تحميل الصورة</p>
                              </div>
                            </div>
                          )}
                         
                         {!request.national_id_front_image && !request.national_id_back_image && (
                           <div className="col-span-2 text-center py-4">
                             <p className="text-sm text-muted-foreground">لم يتم رفع صور للهوية</p>
                           </div>
                         )}
                       </div>
                     </div>

                     <div className="flex space-x-2">
                      <Button
                        onClick={() => handleApprove(request.id)}
                        disabled={processing}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        موافقة وتفعيل الحساب
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            رفض الطلب
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Requests History */}
        <div>
          <div className="flex items-center space-x-2 mb-6">
            <Eye className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">سجل جميع الطلبات</h2>
          </div>
          
          {requests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  لا توجد طلبات تحقق
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  لم يتم تقديم أي طلبات للتحقق من الهوية حتى الآن
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((request, index) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center space-x-2 text-base">
                          <User className="h-4 w-4" />
                          <span>{request.profiles?.full_name || 'اسم غير محدد'}</span>
                        </CardTitle>
                        <CardDescription className="flex items-center space-x-4 text-sm">
                          <span className="flex items-center space-x-1">
                            <FileText className="h-3 w-3" />
                            <span>{request.national_id}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{request.profiles?.phone || 'غير محدد'}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(request.submitted_at)}</span>
                          </span>
                        </CardDescription>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </CardHeader>
                  
                  {(request.reviewed_at || request.rejection_reason) && (
                    <CardContent>
                      <Separator className="mb-4" />
                      <div className="space-y-2 text-sm">
                        {request.reviewed_at && (
                          <p className="text-gray-600 dark:text-gray-400">
                            <strong>تاريخ المراجعة:</strong> {formatDate(request.reviewed_at)}
                          </p>
                        )}
                        {request.rejection_reason && (
                          <div>
                            <strong className="text-red-600">سبب الرفض:</strong>
                            <p className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-800 dark:text-red-300">
                              {request.rejection_reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;