import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from '@/integrations/supabase/client';
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
import { useDigitalCardSettings } from '@/hooks/useDigitalCardSettings';
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
  AlertCircle,
  Settings
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DigitalCards = () => {
  const { orders, cardTypes, loading, processing, approveOrder, rejectOrder, refetch } = useAdminDigitalCards();
  const { updating, updateCardType, updateFeeSettings } = useDigitalCardSettings();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  
  // Settings states
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(200);
  const [minAmount, setMinAmount] = useState<number>(5);
  const [maxAmount, setMaxAmount] = useState<number>(500);
  const [feeType, setFeeType] = useState<'percentage' | 'fixed'>('percentage');
  const [feeValue, setFeeValue] = useState<number>(3);
  const [minFee, setMinFee] = useState<number>(0);
  const [maxFee, setMaxFee] = useState<number | undefined>(undefined);
  const [uploading, setUploading] = useState(false);

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
    setReceiptImage(null);
    setReceiptPreview('');
    setTransactionRef('');
    setAdminNotes('');
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
      if (!receiptImage || !transactionRef) {
        return;
      }

      setUploading(true);
      try {
        // رفع الصورة إلى Supabase Storage
        const fileExt = receiptImage.name.split('.').pop();
        const fileName = `${selectedOrder.id}_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('digital-card-receipts')
          .upload(fileName, receiptImage);

        if (uploadError) throw uploadError;

        // الحصول على الرابط العام للصورة
        const { data: { publicUrl } } = supabase.storage
          .from('digital-card-receipts')
          .getPublicUrl(fileName);

        success = (await approveOrder(selectedOrder.id, publicUrl, transactionRef, adminNotes)).success;
      } catch (error) {
        console.error('Error uploading receipt:', error);
        success = false;
      } finally {
        setUploading(false);
      }
    } else if (actionType === 'reject') {
      success = (await rejectOrder(selectedOrder.id, adminNotes)).success;
    }

    if (success) {
      setSelectedOrder(null);
      setActionType(null);
      setReceiptImage(null);
      setReceiptPreview('');
      setTransactionRef('');
      setAdminNotes('');
    }
  };

  const handleSaveCardSettings = async () => {
    if (!editingCardId) return;
    
    const success = await updateCardType(editingCardId, {
      exchange_rate: exchangeRate,
      min_amount: minAmount,
      max_amount: maxAmount,
    });
    
    if (success) {
      setEditingCardId(null);
      refetch();
    }
  };

  const handleToggleCardActive = async (cardId: string, currentStatus: boolean) => {
    const success = await updateCardType(cardId, {
      is_active: !currentStatus,
    });
    
    if (success) {
      refetch();
    }
  };

  const handleSaveFeeSettings = async () => {
    const success = await updateFeeSettings({
      fee_type: feeType,
      fee_value: feeValue,
      min_fee: minFee,
      max_fee: maxFee,
    });
    
    if (success) {
      // Settings saved
    }
  };

  const startEditingCard = (card: any) => {
    setEditingCardId(card.id);
    setExchangeRate(card.exchange_rate);
    setMinAmount(card.min_amount);
    setMaxAmount(card.max_amount);
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

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders">الطلبات</TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 ml-2" />
            الإعدادات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6 mt-6">

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
      </TabsContent>

      <TabsContent value="settings" className="space-y-6 mt-6">
        {/* Card Types Settings */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات أنواع البطاقات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cardTypes.map((card) => (
              <div key={card.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {card.logo_url && (
                      <img src={card.logo_url} alt={card.name_ar} className="w-12 h-12 object-contain" />
                    )}
                    <div>
                      <h3 className="font-semibold">{card.name_ar}</h3>
                      <p className="text-sm text-muted-foreground">{card.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${card.id}`}>نشط</Label>
                      <Switch
                        id={`active-${card.id}`}
                        checked={card.is_active}
                        onCheckedChange={() => handleToggleCardActive(card.id, card.is_active)}
                        disabled={updating}
                      />
                    </div>
                    {editingCardId === card.id ? (
                      <>
                        <Button 
                          onClick={handleSaveCardSettings} 
                          disabled={updating}
                          size="sm"
                        >
                          حفظ
                        </Button>
                        <Button 
                          onClick={() => setEditingCardId(null)} 
                          variant="outline"
                          size="sm"
                        >
                          إلغاء
                        </Button>
                      </>
                    ) : (
                      <Button 
                        onClick={() => startEditingCard(card)} 
                        variant="outline"
                        size="sm"
                      >
                        تعديل
                      </Button>
                    )}
                  </div>
                </div>

                {editingCardId === card.id ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`exchange-${card.id}`}>سعر الصرف (دج/$)</Label>
                      <Input
                        id={`exchange-${card.id}`}
                        type="number"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(Number(e.target.value))}
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`min-${card.id}`}>الحد الأدنى ($)</Label>
                      <Input
                        id={`min-${card.id}`}
                        type="number"
                        value={minAmount}
                        onChange={(e) => setMinAmount(Number(e.target.value))}
                        step="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`max-${card.id}`}>الحد الأقصى ($)</Label>
                      <Input
                        id={`max-${card.id}`}
                        type="number"
                        value={maxAmount}
                        onChange={(e) => setMaxAmount(Number(e.target.value))}
                        step="1"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">سعر الصرف:</span>
                      <span className="font-semibold mr-2">{card.exchange_rate} دج/$</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الحد الأدنى:</span>
                      <span className="font-semibold mr-2">${card.min_amount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الحد الأقصى:</span>
                      <span className="font-semibold mr-2">${card.max_amount}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Fee Settings */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات العمولة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>نوع العمولة</Label>
              <RadioGroup value={feeType} onValueChange={(value: any) => setFeeType(value)} className="flex gap-4 mt-2">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="percentage" id="percentage" />
                  <Label htmlFor="percentage">نسبة مئوية (%)</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed">مبلغ ثابت (دج)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fee-value">
                  {feeType === 'percentage' ? 'النسبة المئوية (%)' : 'المبلغ الثابت (دج)'}
                </Label>
                <Input
                  id="fee-value"
                  type="number"
                  value={feeValue}
                  onChange={(e) => setFeeValue(Number(e.target.value))}
                  step={feeType === 'percentage' ? '0.1' : '1'}
                />
              </div>
              <div>
                <Label htmlFor="min-fee">الحد الأدنى للعمولة (دج)</Label>
                <Input
                  id="min-fee"
                  type="number"
                  value={minFee}
                  onChange={(e) => setMinFee(Number(e.target.value))}
                  step="1"
                />
              </div>
              <div>
                <Label htmlFor="max-fee">الحد الأقصى للعمولة (دج)</Label>
                <Input
                  id="max-fee"
                  type="number"
                  value={maxFee || ''}
                  onChange={(e) => setMaxFee(e.target.value ? Number(e.target.value) : undefined)}
                  step="1"
                  placeholder="اختياري"
                />
              </div>
            </div>

            <Button onClick={handleSaveFeeSettings} disabled={updating} className="w-full">
              حفظ إعدادات العمولة
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

      {/* Action Dialog */}
      <Dialog 
        open={!!selectedOrder} 
        onOpenChange={() => {
          setSelectedOrder(null);
          setActionType(null);
          setReceiptImage(null);
          setReceiptPreview('');
          setTransactionRef('');
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
                  <Label htmlFor="receiptImage">صورة الوصل *</Label>
                  <Input
                    id="receiptImage"
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptChange}
                    className="mt-1"
                  />
                  {receiptPreview && (
                    <div className="mt-2">
                      <img 
                        src={receiptPreview} 
                        alt="معاينة الوصل" 
                        className="max-h-40 rounded-lg border"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="transactionRef">معرف المعاملة *</Label>
                  <Input
                    id="transactionRef"
                    placeholder="أدخل معرف المعاملة"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <p className="text-sm font-semibold mb-1">رسالة الشكر الافتراضية:</p>
                  <p className="text-sm text-muted-foreground">
                    "شكراً لك لثقتك بنا، شارك تجربتك مع الأعضاء في تلغرام الخاص بنا"
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    سيتم إضافة ملاحظاتك أدناه إلى هذه الرسالة
                  </p>
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
                  
                  {selectedOrder.receipt_image && (
                    <>
                      <div className="text-muted-foreground col-span-2">صورة الوصل:</div>
                      <div className="col-span-2">
                        <img 
                          src={selectedOrder.receipt_image} 
                          alt="وصل الدفع" 
                          className="max-h-60 rounded-lg border"
                        />
                      </div>
                    </>
                  )}
                  
                  {selectedOrder.transaction_reference && (
                    <>
                      <div className="text-muted-foreground">معرف المعاملة:</div>
                      <div className="font-mono">{selectedOrder.transaction_reference}</div>
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
                disabled={processing || uploading || (actionType === 'approve' && (!receiptImage || !transactionRef))}
                variant={actionType === 'reject' ? 'destructive' : 'default'}
              >
                {(processing || uploading) && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                {actionType === 'approve' && (uploading ? 'جاري رفع الصورة...' : 'تأكيد الموافقة')}
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
