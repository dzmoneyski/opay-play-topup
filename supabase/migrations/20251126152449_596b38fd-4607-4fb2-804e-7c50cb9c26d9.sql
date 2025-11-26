-- حذف جدول التحقق من الهوية القديم بالكامل
DROP TABLE IF EXISTS verification_requests CASCADE;

-- إنشاء جدول جديد بسيط وواضح
CREATE TABLE verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- معلومات الهوية الأساسية
  national_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  
  -- صور الهوية
  id_front_image TEXT NOT NULL,
  id_back_image TEXT NOT NULL,
  
  -- حالة الطلب
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  
  -- تواريخ المعالجة
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  
  -- تواريخ النظام
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- فهرس للبحث السريع
CREATE INDEX idx_verification_user ON verification_requests(user_id);
CREATE INDEX idx_verification_status ON verification_requests(status);
CREATE INDEX idx_verification_national_id ON verification_requests(national_id);

-- تفعيل RLS
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول البسيطة
-- المستخدم يمكنه إنشاء طلب واحد
CREATE POLICY "Users can create their verification request"
  ON verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- المستخدم يمكنه قراءة طلبه الخاص
CREATE POLICY "Users can view their own request"
  ON verification_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- المشرفون يمكنهم قراءة جميع الطلبات
CREATE POLICY "Admins can view all requests"
  ON verification_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- المشرفون يمكنهم تحديث الطلبات
CREATE POLICY "Admins can update requests"
  ON verification_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- تحديث تلقائي لـ updated_at
CREATE OR REPLACE FUNCTION update_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER verification_updated_at
  BEFORE UPDATE ON verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_verification_updated_at();

-- دالة الموافقة على الطلب
CREATE OR REPLACE FUNCTION approve_verification(request_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE verification_requests
  SET 
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  WHERE id = request_id;
  
  -- تحديث حالة التحقق في الملف الشخصي
  UPDATE profiles
  SET 
    is_identity_verified = true,
    identity_verification_status = 'verified'
  WHERE user_id = (
    SELECT user_id FROM verification_requests WHERE id = request_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة رفض الطلب
CREATE OR REPLACE FUNCTION reject_verification(request_id UUID, reason TEXT)
RETURNS void AS $$
BEGIN
  UPDATE verification_requests
  SET 
    status = 'rejected',
    rejection_reason = reason,
    reviewed_at = now(),
    reviewed_by = auth.uid()
  WHERE id = request_id;
  
  -- تحديث حالة التحقق في الملف الشخصي
  UPDATE profiles
  SET 
    identity_verification_status = 'rejected'
  WHERE user_id = (
    SELECT user_id FROM verification_requests WHERE id = request_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;