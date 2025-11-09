-- إنشاء جدول أنواع البطاقات الإلكترونية
CREATE TABLE IF NOT EXISTS public.digital_card_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  logo_url TEXT,
  provider TEXT NOT NULL, -- 'redotpay', 'payeer', 'webmoney', 'perfectmoney', 'skrill', etc.
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول فئات البطاقات المتاحة
CREATE TABLE IF NOT EXISTS public.digital_card_denominations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_type_id UUID NOT NULL REFERENCES public.digital_card_types(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL, -- القيمة الاسمية للبطاقة
  price_dzd NUMERIC NOT NULL, -- السعر بالدينار الجزائري
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول طلبات شراء البطاقات
CREATE TABLE IF NOT EXISTS public.digital_card_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_type_id UUID NOT NULL REFERENCES public.digital_card_types(id),
  denomination_id UUID NOT NULL REFERENCES public.digital_card_denominations(id),
  amount NUMERIC NOT NULL, -- القيمة الاسمية
  price_paid NUMERIC NOT NULL, -- المبلغ المدفوع
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  card_code TEXT, -- رمز البطاقة (يملأ بعد المعالجة)
  card_pin TEXT, -- رقم PIN إذا كان مطلوباً
  card_details JSONB, -- تفاصيل إضافية للبطاقة
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.digital_card_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_card_denominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_card_orders ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لأنواع البطاقات
CREATE POLICY "الجميع يمكنهم عرض أنواع البطاقات النشطة"
ON public.digital_card_types
FOR SELECT
USING (is_active = true);

CREATE POLICY "المسؤولون يمكنهم إدارة أنواع البطاقات"
ON public.digital_card_types
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- سياسات RLS لفئات البطاقات
CREATE POLICY "الجميع يمكنهم عرض الفئات المتاحة"
ON public.digital_card_denominations
FOR SELECT
USING (is_available = true);

CREATE POLICY "المسؤولون يمكنهم إدارة الفئات"
ON public.digital_card_denominations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- سياسات RLS لطلبات الشراء
CREATE POLICY "المستخدمون يمكنهم إنشاء طلباتهم"
ON public.digital_card_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "المستخدمون يمكنهم عرض طلباتهم"
ON public.digital_card_orders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "المسؤولون يمكنهم عرض جميع الطلبات"
ON public.digital_card_orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "المسؤولون يمكنهم تحديث الطلبات"
ON public.digital_card_orders
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- إنشاء trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_digital_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_digital_card_types_updated_at
BEFORE UPDATE ON public.digital_card_types
FOR EACH ROW
EXECUTE FUNCTION update_digital_cards_updated_at();

CREATE TRIGGER update_digital_card_denominations_updated_at
BEFORE UPDATE ON public.digital_card_denominations
FOR EACH ROW
EXECUTE FUNCTION update_digital_cards_updated_at();

CREATE TRIGGER update_digital_card_orders_updated_at
BEFORE UPDATE ON public.digital_card_orders
FOR EACH ROW
EXECUTE FUNCTION update_digital_cards_updated_at();

-- إدراج أنواع البطاقات الأساسية
INSERT INTO public.digital_card_types (name, name_ar, provider, description_ar, display_order) VALUES
('Redotpay', 'ريدوت باي', 'redotpay', 'بطاقة دفع إلكترونية عالمية', 1),
('Payeer', 'بايير', 'payeer', 'محفظة إلكترونية عالمية', 2),
('WebMoney', 'ويب موني', 'webmoney', 'نظام دفع إلكتروني', 3),
('Perfect Money', 'بيرفكت موني', 'perfectmoney', 'نظام دفع إلكتروني آمن', 4),
('Skrill', 'سكريل', 'skrill', 'محفظة إلكترونية للمدفوعات الدولية', 5);

-- إدراج فئات تجريبية (يمكن للمسؤول تعديلها لاحقاً)
INSERT INTO public.digital_card_denominations (card_type_id, amount, price_dzd, stock_quantity)
SELECT id, 10, 2000, 0 FROM public.digital_card_types WHERE provider = 'redotpay'
UNION ALL
SELECT id, 25, 4500, 0 FROM public.digital_card_types WHERE provider = 'redotpay'
UNION ALL
SELECT id, 50, 8500, 0 FROM public.digital_card_types WHERE provider = 'redotpay'
UNION ALL
SELECT id, 10, 2000, 0 FROM public.digital_card_types WHERE provider = 'payeer'
UNION ALL
SELECT id, 25, 4500, 0 FROM public.digital_card_types WHERE provider = 'payeer'
UNION ALL
SELECT id, 50, 8500, 0 FROM public.digital_card_types WHERE provider = 'payeer';

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX idx_digital_card_orders_user_id ON public.digital_card_orders(user_id);
CREATE INDEX idx_digital_card_orders_status ON public.digital_card_orders(status);
CREATE INDEX idx_digital_card_denominations_card_type ON public.digital_card_denominations(card_type_id);