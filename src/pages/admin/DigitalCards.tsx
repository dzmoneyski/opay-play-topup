import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminDigitalCards } from '@/hooks/useAdminDigitalCards';
import {
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Loader2,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DigitalCards = () => {
  const { orders, cardTypes, loading, processing, approveOrder, rejectOrder } = useAdminDigitalCards();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [cardCode, setCardCode] = useState('');
  const [cardPin, setCardPin] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            <CheckCircle className="h-3 w-3 ml-1" />
            مكتمل
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 ml-1" />
            قيد الانتظار
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 ml-1" />
            مرفوض
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getCardTypeName = (cardTypeId: string) => {
    const cardType = cardTypes.find(c => c.id === cardTypeId);
    return cardType?.name_ar || 'بطاقة';
  };

  const handleApprove = (order: any) => {
    setSelectedOrder(order);
    setActionType('approve');
    setCardCode('');
    setCardPin('');
    setAdminNotes('');
  };

  const handleReject = (order: any) => {
    setSelectedOrder(order);
    setActionType('reject');
    setAdminNotes('');
  };

  const handleConfirmAction = async () => {
    if (!selectedOrder) return;

    let success = false;
    if (actionType === 'approve') {
      if (!cardCode) {
        return;
      }
      success = (await approveOrder(selectedOrder.id, cardCode, cardPin, adminNotes)).success;
    } else if (actionType === 'reject') {
      success = (await rejectOrder(selectedOrder.id, adminNotes)).success;
    }

    if (success) {
      setSelectedOrder(null);
      setActionType(null);
      setCardCode('');
      setCardPin('');
      setAdminNotes('');
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const completedOrders = orders.filter(o => o.status === 'completed');
  const rejectedOrders = orders.filter(o => o.status === 'rejected');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">إدارة البطاقات الرقمية</h1>
        <p className="text-muted-foreground">إدارة طلبات البطاقات الرقمية والموافقة عليها</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              الطلبات المعلقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{pendingOrders.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              الطلبات المكتملة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="text-2xl font-bold">{completedOrders.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              الطلبات المرفوضة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold">{rejectedOrders.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Orders Alert */}
      {pendingOrders.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            لديك {pendingOrders.length} طلب قيد الانتظار يحتاج إلى المراجعة
          </AlertDescription>
        </Alert>
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>جميع الطلبات</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">لا توجد طلبات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>نوع البطاقة</TableHead>
                    <TableHead>معرف الحساب</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {order.profiles?.full_name || 'غير محدد'}
                            </span>
                          </div>
                          {order.profiles?.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {order.profiles.phone}
                            </div>
                          )}
                          {order.profiles?.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {order.profiles.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-primary" />
                          {getCardTypeName(order.card_type_id)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="px-2 py-1 bg-muted rounded text-sm">
                          {order.account_id}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span className="font-semibold">${order.amount_usd}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.total_dzd.toFixed(2)} دج
                          </div>
                          <div className="text-xs text-muted-foreground">
                            (رسوم: {order.fee_amount.toFixed(2)} دج)
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(order.created_at).toLocaleDateString('ar-DZ')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString('ar-DZ')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {order.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(order)}
                                disabled={processing}
                              >
                                <CheckCircle className="h-4 w-4 ml-1" />
                                موافقة
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(order)}
                                disabled={processing}
                              >
                                <XCircle className="h-4 w-4 ml-1" />
                                رفض
                              </Button>
                            </>
                          )}
                          {order.status !== 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedOrder(order);
                                setActionType(null);
                              }}
                            >
                              <Eye className="h-4 w-4 ml-1" />
                              عرض
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog 
        open={!!selectedOrder} 
        onOpenChange={() => {
          setSelectedOrder(null);
          setActionType(null);
          setCardCode('');
          setCardPin('');
          setAdminNotes('');
        }}
      >
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'الموافقة على الطلب'}
              {actionType === 'reject' && 'رفض الطلب'}
              {!actionType && 'تفاصيل الطلب'}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder && (
                <div className="space-y-2 text-sm">
                  <div>المستخدم: {selectedOrder.profiles?.full_name}</div>
                  <div>البطاقة: {getCardTypeName(selectedOrder.card_type_id)}</div>
                  <div>المبلغ: ${selectedOrder.amount_usd} ({selectedOrder.total_dzd} دج)</div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType === 'approve' && (
              <>
                <div>
                  <Label htmlFor="cardCode">كود البطاقة *</Label>
                  <Input
                    id="cardCode"
                    placeholder="أدخل كود البطاقة"
                    value={cardCode}
                    onChange={(e) => setCardCode(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cardPin">رمز PIN (اختياري)</Label>
                  <Input
                    id="cardPin"
                    placeholder="أدخل رمز PIN إذا كان متوفراً"
                    value={cardPin}
                    onChange={(e) => setCardPin(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {(actionType === 'approve' || actionType === 'reject') && (
              <div>
                <Label htmlFor="adminNotes">ملاحظات إدارية (اختياري)</Label>
                <Textarea
                  id="adminNotes"
                  placeholder="أضف ملاحظات للمستخدم..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            )}

            {!actionType && selectedOrder && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">الحالة:</div>
                  <div>{getStatusBadge(selectedOrder.status)}</div>
                  
                  <div className="text-muted-foreground">معرف الحساب:</div>
                  <div className="font-mono">{selectedOrder.account_id}</div>
                  
                  {selectedOrder.card_code && (
                    <>
                      <div className="text-muted-foreground">كود البطاقة:</div>
                      <div className="font-mono">{selectedOrder.card_code}</div>
                    </>
                  )}
                  
                  {selectedOrder.card_pin && (
                    <>
                      <div className="text-muted-foreground">PIN:</div>
                      <div className="font-mono">{selectedOrder.card_pin}</div>
                    </>
                  )}
                  
                  {selectedOrder.admin_notes && (
                    <>
                      <div className="text-muted-foreground col-span-2">ملاحظات:</div>
                      <div className="col-span-2">{selectedOrder.admin_notes}</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedOrder(null);
                setActionType(null);
              }}
            >
              إلغاء
            </Button>
            {actionType && (
              <Button
                onClick={handleConfirmAction}
                disabled={processing || (actionType === 'approve' && !cardCode)}
                variant={actionType === 'reject' ? 'destructive' : 'default'}
              >
                {processing && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                {actionType === 'approve' && 'تأكيد الموافقة'}
                {actionType === 'reject' && 'تأكيد الرفض'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DigitalCards;
