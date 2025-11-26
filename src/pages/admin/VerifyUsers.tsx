import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useVerification } from '@/hooks/useVerification';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Clock, XCircle, Shield, Search, Eye, ZoomIn } from 'lucide-react';
import { AdminAlertBanner } from '@/components/AdminAlertBanner';

/**
 * صفحة إدارة التحقق من الهوية
 * واجهة بسيطة ونظيفة للمشرفين
 */
export default function VerifyUsers() {
  const navigate = useNavigate();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const { requests, loading, approveRequest, rejectRequest } = useVerification();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [processing, setProcessing] = useState(false);

  // التحقق من الصلاحيات
  React.useEffect(() => {
    if (!rolesLoading && !isAdmin) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية الوصول",
        variant: "destructive"
      });
      navigate('/admin');
    }
  }, [isAdmin, rolesLoading]);

  // الموافقة على الطلب
  const handleApprove = async (id: string) => {
    setProcessing(true);
    const result = await approveRequest(id);
    
    if (result.error) {
      toast({
        title: "خطأ",
        description: result.error,
        variant: "destructive"
      });
    } else {
      toast({
        title: "تم بنجاح",
        description: "تمت الموافقة على الطلب",
      });
    }
    setProcessing(false);
  };

  // رفض الطلب
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
        description: "تم رفض الطلب",
      });
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason('');
    }
    setProcessing(false);
  };

  if (rolesLoading || loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // الإحصائيات
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  // التصفية
  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.national_id.includes(searchTerm) ||
      req.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getImageUrl = (path: string) => {
    return `https://zxnwixjdwimfblcwfkgo.supabase.co/storage/v1/object/public/identity-documents/${path}`;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <AdminAlertBanner />
      
      {/* العنوان */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            التحقق من الهوية
          </h1>
          <p className="text-muted-foreground mt-1">
            مراجعة وإدارة طلبات التحقق من الهوية
          </p>
        </div>
        
        {/* البحث */}
        <div className="relative w-96">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ابحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* التبويبات */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            الكل ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            معلقة ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            موافق ({approvedCount})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            مرفوضة ({rejectedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6 space-y-4">
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">لا توجد طلبات</p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{request.full_name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {request.user?.phone || 'لا يوجد رقم'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        رقم الهوية: {request.national_id}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        request.status === 'approved' ? 'default' : 
                        request.status === 'rejected' ? 'destructive' : 
                        'secondary'
                      }
                      className="text-lg px-4 py-2"
                    >
                      {request.status === 'pending' && <><Clock className="w-4 h-4 ml-2" /> معلق</>}
                      {request.status === 'approved' && <><CheckCircle className="w-4 h-4 ml-2" /> موافق</>}
                      {request.status === 'rejected' && <><XCircle className="w-4 h-4 ml-2" /> مرفوض</>}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* الصور */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">الوجه الأمامي</p>
                      <div 
                        className="relative group cursor-pointer rounded-lg overflow-hidden border-2 hover:border-primary transition-colors"
                        onClick={() => {
                          setSelectedImage(getImageUrl(request.id_front_image));
                          setShowImageDialog(true);
                        }}
                      >
                        <img 
                          src={getImageUrl(request.id_front_image)}
                          alt="الوجه الأمامي"
                          className="w-full h-40 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-2">الوجه الخلفي</p>
                      <div 
                        className="relative group cursor-pointer rounded-lg overflow-hidden border-2 hover:border-primary transition-colors"
                        onClick={() => {
                          setSelectedImage(getImageUrl(request.id_back_image));
                          setShowImageDialog(true);
                        }}
                      >
                        <img 
                          src={getImageUrl(request.id_back_image)}
                          alt="الوجه الخلفي"
                          className="w-full h-40 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* سبب الرفض */}
                  {request.status === 'rejected' && request.rejection_reason && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200">
                      <p className="text-sm font-semibold text-red-900 dark:text-red-300 mb-1">
                        سبب الرفض:
                      </p>
                      <p className="text-sm text-red-800 dark:text-red-400">
                        {request.rejection_reason}
                      </p>
                    </div>
                  )}

                  {/* الأزرار */}
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(request.id)}
                        disabled={processing}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 ml-2" />
                        موافقة
                      </Button>
                      
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRejectDialog(true);
                        }}
                        disabled={processing}
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 ml-2" />
                        رفض
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* نافذة الرفض */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض الطلب</DialogTitle>
            <DialogDescription>
              أدخل سبب الرفض ليتمكن المستخدم من معرفة المشكلة
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            placeholder="مثال: الصورة غير واضحة..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
            className="mt-4"
          />
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason('');
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || processing}
            >
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة عرض الصورة */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-5xl">
          <img 
            src={selectedImage}
            alt="معاينة"
            className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
