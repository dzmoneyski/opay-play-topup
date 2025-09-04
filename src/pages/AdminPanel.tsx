import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useVerificationRequests } from '@/hooks/useVerificationRequests';
import { useToast } from '@/hooks/use-toast';
import BackButton from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle, Clock, Eye, Shield, Users, XCircle } from 'lucide-react';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const { requests, loading: requestsLoading, approveRequest, rejectRequest } = useVerificationRequests();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
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
        description: "تم الموافقة على طلب التحقق",
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
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" />قيد المراجعة</Badge>;
      case 'approved':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-500"><CheckCircle className="w-3 h-3" />موافق عليه</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" />مرفوض</Badge>;
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
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="relative bg-gradient-hero overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-glass"></div>
        <div className="container mx-auto px-4 py-6 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <BackButton />
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-white" />
              <div>
                <h1 className="text-2xl font-bold text-white">لوحة الإدارة</h1>
                <p className="text-white/80">إدارة طلبات التحقق من الهوية</p>
              </div>
            </div>
            <div className="w-12"></div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">إجمالي الطلبات</p>
                    <p className="text-2xl font-bold text-white">{totalRequests}</p>
                  </div>
                  <Users className="h-8 w-8 text-white/60" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">قيد المراجعة</p>
                    <p className="text-2xl font-bold text-yellow-300">{pendingRequests.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-300/60" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">موافق عليها</p>
                    <p className="text-2xl font-bold text-green-300">{approvedRequests}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-300/60" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">مرفوضة</p>
                    <p className="text-2xl font-bold text-red-300">{rejectedRequests}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-300/60" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Pending Requests Section */}
          {pendingRequests.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-300" />
                طلبات تحتاج مراجعة ({pendingRequests.length})
              </h2>
              <div className="grid gap-4">
                {pendingRequests.map((request) => (
                  <Card key={request.id} className="bg-white/10 backdrop-blur-sm border-white/20">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white">
                            {request.profiles?.full_name || 'اسم غير محدد'}
                          </CardTitle>
                          <CardDescription className="text-white/80">
                            رقم الهوية: {request.national_id}
                          </CardDescription>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-white/80 text-sm">
                          <p>رقم الهاتف: {request.profiles?.phone || 'غير محدد'}</p>
                          <p>تاريخ التقديم: {formatDate(request.submitted_at)}</p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApprove(request.id)}
                            disabled={processing}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            موافقة
                          </Button>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="destructive"
                                onClick={() => setSelectedRequest(request)}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                رفض
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-card border-border">
                              <DialogHeader>
                                <DialogTitle>رفض طلب التحقق</DialogTitle>
                                <DialogDescription>
                                  يرجى إدخال سبب رفض طلب التحقق من الهوية
                                </DialogDescription>
                              </DialogHeader>
                              <Textarea
                                placeholder="سبب الرفض..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="mt-4"
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
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All Requests Section */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              جميع الطلبات
            </h2>
            
            {requests.length === 0 ? (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 text-white/50 mx-auto mb-4" />
                  <p className="text-white/80">لا توجد طلبات تحقق حتى الآن</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {requests.map((request) => (
                  <Card key={request.id} className="bg-white/10 backdrop-blur-sm border-white/20">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white">
                            {request.profiles?.full_name || 'اسم غير محدد'}
                          </CardTitle>
                          <CardDescription className="text-white/80">
                            رقم الهوية: {request.national_id}
                          </CardDescription>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-white/80 text-sm space-y-1">
                        <p>رقم الهاتف: {request.profiles?.phone || 'غير محدد'}</p>
                        <p>تاريخ التقديم: {formatDate(request.submitted_at)}</p>
                        {request.reviewed_at && (
                          <p>تاريخ المراجعة: {formatDate(request.reviewed_at)}</p>
                        )}
                        {request.rejection_reason && (
                          <p className="text-red-300">سبب الرفض: {request.rejection_reason}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;