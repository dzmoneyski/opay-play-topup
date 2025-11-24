import { useState } from "react";
import { AdminNavbar } from "@/components/AdminNavbar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAdminCardDeliveryOrders } from "@/hooks/useAdminCardDeliveryOrders";
import { Truck, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const STATUS_LABELS = {
  pending: { label: "قيد الانتظار", variant: "secondary" as const },
  confirmed: { label: "مؤكد", variant: "default" as const },
  preparing: { label: "قيد التحضير", variant: "default" as const },
  shipped: { label: "تم الشحن", variant: "default" as const },
  delivered: { label: "تم التوصيل", variant: "default" as const },
  cancelled: { label: "ملغي", variant: "destructive" as const },
};

const PAYMENT_STATUS_LABELS = {
  cod_pending: { label: "في انتظار الدفع", variant: "secondary" as const },
  cod_received: { label: "تم الدفع", variant: "default" as const },
};

export default function CardDeliveryOrders() {
  const { orders, isLoading, updateOrder, deleteOrder } = useAdminCardDeliveryOrders();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: "",
    payment_status: "",
    tracking_number: "",
    admin_notes: "",
  });

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setUpdateData({
      status: order.status,
      payment_status: order.payment_status,
      tracking_number: order.tracking_number || "",
      admin_notes: order.admin_notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;

    try {
      await updateOrder({
        orderId: selectedOrder.id,
        updates: updateData,
      });
      setIsDialogOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;

    try {
      await deleteOrder(orderId);
    } catch (error) {
      console.error("Error deleting order:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Truck className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">طلبات توصيل البطاقات</h1>
                <p className="text-muted-foreground">إدارة طلبات توصيل بطاقات OPay</p>
              </div>
            </div>

            <Card className="p-6">
              {isLoading ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد طلبات توصيل
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead>الهاتف</TableHead>
                        <TableHead>الولاية</TableHead>
                        <TableHead>قيمة البطاقة</TableHead>
                        <TableHead>المجموع</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>حالة الدفع</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", {
                              locale: ar,
                            })}
                          </TableCell>
                          <TableCell className="font-medium">{order.full_name}</TableCell>
                          <TableCell>{order.phone}</TableCell>
                          <TableCell>{order.wilaya}</TableCell>
                          <TableCell>{order.card_amount.toLocaleString()} دج</TableCell>
                          <TableCell className="font-semibold">
                            {order.total_amount.toLocaleString()} دج
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]?.variant}>
                              {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={PAYMENT_STATUS_LABELS[order.payment_status as keyof typeof PAYMENT_STATUS_LABELS]?.variant}>
                              {PAYMENT_STATUS_LABELS[order.payment_status as keyof typeof PAYMENT_STATUS_LABELS]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewOrder(order)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteOrder(order.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>

      {/* Update Order Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب وتحديثه</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Details */}
              <Card className="p-4 bg-muted/50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">الاسم:</span>
                    <p className="font-semibold">{selectedOrder.full_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الهاتف:</span>
                    <p className="font-semibold">{selectedOrder.phone}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الولاية:</span>
                    <p className="font-semibold">{selectedOrder.wilaya}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">قيمة البطاقة:</span>
                    <p className="font-semibold">{selectedOrder.card_amount.toLocaleString()} دج</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">العنوان:</span>
                    <p className="font-semibold">{selectedOrder.address}</p>
                  </div>
                  {selectedOrder.delivery_notes && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">ملاحظات العميل:</span>
                      <p className="font-semibold">{selectedOrder.delivery_notes}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Update Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>حالة الطلب</Label>
                  <Select
                    value={updateData.status}
                    onValueChange={(value) =>
                      setUpdateData({ ...updateData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>حالة الدفع</Label>
                  <Select
                    value={updateData.payment_status}
                    onValueChange={(value) =>
                      setUpdateData({ ...updateData, payment_status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_STATUS_LABELS).map(([value, { label }]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>رقم التتبع</Label>
                  <Input
                    value={updateData.tracking_number}
                    onChange={(e) =>
                      setUpdateData({ ...updateData, tracking_number: e.target.value })
                    }
                    placeholder="أدخل رقم التتبع"
                  />
                </div>

                <div className="space-y-2">
                  <Label>ملاحظات الإدارة</Label>
                  <Textarea
                    value={updateData.admin_notes}
                    onChange={(e) =>
                      setUpdateData({ ...updateData, admin_notes: e.target.value })
                    }
                    placeholder="أضف ملاحظات..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleUpdateOrder}>
                  حفظ التحديثات
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
