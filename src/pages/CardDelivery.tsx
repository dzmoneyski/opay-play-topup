import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCardDeliveryOrders } from "@/hooks/useCardDeliveryOrders";
import { useDeliveryFeeSettings } from "@/hooks/useDeliveryFeeSettings";
import BackButton from "@/components/BackButton";
import { Truck, CreditCard, MapPin, Phone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const WILAYAS = [
  "أدرار", "الشلف", "الأغواط", "أم البواقي", "باتنة", "بجاية", "بسكرة", "بشار",
  "البليدة", "البويرة", "تمنراست", "تبسة", "تلمسان", "تيارت", "تيزي وزو", "الجزائر",
  "الجلفة", "جيجل", "سطيف", "سعيدة", "سكيكدة", "سيدي بلعباس", "عنابة", "قالمة",
  "قسنطينة", "المدية", "مستغانم", "المسيلة", "معسكر", "ورقلة", "وهران", "البيض",
  "إليزي", "برج بوعريريج", "بومرداس", "الطارف", "تندوف", "تيسمسيلت", "الوادي",
  "خنشلة", "سوق أهراس", "تيبازة", "ميلة", "عين الدفلى", "النعامة", "عين تموشنت",
  "غرداية", "غليزان", "تيميمون", "برج باجي مختار", "أولاد جلال", "بني عباس",
  "عين صالح", "عين قزام", "تقرت", "جانت", "المغير", "المنيعة"
];

const CARD_AMOUNTS = [500, 1000, 2000, 5000];

export default function CardDelivery() {
  const navigate = useNavigate();
  const { createOrder, isCreating } = useCardDeliveryOrders();
  const { getDeliveryFee } = useDeliveryFeeSettings();

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    wilaya: "",
    address: "",
    card_amount: 1000,
    delivery_notes: "",
  });

  const deliveryFee = getDeliveryFee(formData.wilaya);
  const totalAmount = formData.card_amount + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.phone || !formData.wilaya || !formData.address) {
      return;
    }

    try {
      await createOrder({
        full_name: formData.full_name,
        phone: formData.phone,
        wilaya: formData.wilaya,
        address: formData.address,
        card_amount: formData.card_amount,
        delivery_fee: deliveryFee,
        delivery_notes: formData.delivery_notes,
      });

      navigate("/transactions");
    } catch (error) {
      console.error("Error creating order:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-4">
        <BackButton />

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Truck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">طلب بطاقة OPay للمنزل</h1>
          <p className="text-muted-foreground">الدفع عند الاستلام</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Card Amount Selection */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                <Label className="text-lg font-semibold">اختر قيمة البطاقة</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CARD_AMOUNTS.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant={formData.card_amount === amount ? "default" : "outline"}
                    className="h-16 text-lg font-bold"
                    onClick={() => setFormData({ ...formData, card_amount: amount })}
                  >
                    {amount.toLocaleString()} دج
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          {/* Delivery Information */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <Label className="text-lg font-semibold">معلومات التوصيل</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">
                  <User className="w-4 h-4 inline ml-2" />
                  الاسم الكامل
                </Label>
                <Input
                  id="full_name"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="أدخل اسمك الكامل"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="w-4 h-4 inline ml-2" />
                  رقم الهاتف
                </Label>
                <Input
                  id="phone"
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0555123456"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wilaya">الولاية</Label>
                <Select
                  required
                  value={formData.wilaya}
                  onValueChange={(value) => setFormData({ ...formData, wilaya: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الولاية" />
                  </SelectTrigger>
                  <SelectContent>
                    {WILAYAS.map((wilaya) => (
                      <SelectItem key={wilaya} value={wilaya}>
                        {wilaya}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">العنوان الكامل</Label>
                <Textarea
                  id="address"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="أدخل العنوان الكامل مع رقم المنزل واسم الشارع والبلدية"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_notes">ملاحظات إضافية (اختياري)</Label>
                <Textarea
                  id="delivery_notes"
                  value={formData.delivery_notes}
                  onChange={(e) => setFormData({ ...formData, delivery_notes: e.target.value })}
                  placeholder="أي ملاحظات إضافية للتوصيل"
                  rows={2}
                />
              </div>
            </div>
          </Card>

          {/* Order Summary */}
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="space-y-3">
              <h3 className="font-bold text-lg mb-4">ملخص الطلب</h3>
              
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">قيمة البطاقة:</span>
                <span className="font-semibold">{formData.card_amount.toLocaleString()} دج</span>
              </div>

              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">رسوم التوصيل:</span>
                <span className="font-semibold">{deliveryFee.toLocaleString()} دج</span>
              </div>
              <p className="text-xs text-muted-foreground">
                * الزبون هو من يدفعها
              </p>

              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between text-xl font-bold">
                  <span>المجموع الكلي:</span>
                  <span className="text-primary">{totalAmount.toLocaleString()} دج</span>
                </div>
                <p className="text-sm text-muted-foreground text-center mt-2">
                  الدفع عند الاستلام
                </p>
              </div>
            </div>
          </Card>

          <Button
            type="submit"
            size="lg"
            className="w-full text-lg h-14"
            disabled={isCreating}
          >
            <Truck className="w-5 h-5 ml-2" />
            {isCreating ? "جاري إرسال الطلب..." : "تأكيد الطلب"}
          </Button>
        </form>
      </div>
    </div>
  );
}
