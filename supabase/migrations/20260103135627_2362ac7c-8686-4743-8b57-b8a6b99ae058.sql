-- Create phone operators table
CREATE TABLE public.phone_operators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  name_ar text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  min_amount numeric NOT NULL DEFAULT 100,
  max_amount numeric NOT NULL DEFAULT 10000,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_operators ENABLE ROW LEVEL SECURITY;

-- Policies for phone operators
CREATE POLICY "Anyone can view active operators"
ON public.phone_operators FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage operators"
ON public.phone_operators FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert default operators
INSERT INTO public.phone_operators (name, name_ar, slug, min_amount, max_amount, display_order) VALUES
('Mobilis', 'موبيليس', 'mobilis', 100, 10000, 1),
('Djezzy', 'جيزي', 'djezzy', 100, 10000, 2),
('Ooredoo', 'أوريدو', 'ooredoo', 100, 10000, 3),
('Idoom ADSL', 'إيدوم ADSL', 'idoom-adsl', 500, 50000, 4);

-- Create phone topup orders table
CREATE TABLE public.phone_topup_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  operator_id uuid NOT NULL REFERENCES public.phone_operators(id),
  phone_number text NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  notes text,
  processed_at timestamp with time zone,
  processed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_topup_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for phone topup orders
CREATE POLICY "Users can create their own orders"
ON public.phone_topup_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own orders"
ON public.phone_topup_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
ON public.phone_topup_orders FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orders"
ON public.phone_topup_orders FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can view phone topup orders"
ON public.phone_topup_orders FOR SELECT
USING (agent_can(auth.uid(), 'phone_topups'));

CREATE POLICY "Agents can update phone topup orders"
ON public.phone_topup_orders FOR UPDATE
USING (agent_can(auth.uid(), 'phone_topups'));

-- Add phone topup permission to agent_permissions
ALTER TABLE public.agent_permissions
ADD COLUMN can_manage_phone_topups boolean DEFAULT false;

-- Update agent_can function to include phone_topups
CREATE OR REPLACE FUNCTION public.agent_can(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agent_permissions ap
    JOIN public.user_roles ur ON ur.user_id = ap.user_id
    WHERE ap.user_id = _user_id
      AND ur.role = 'agent'
      AND (
        (_permission = 'game_topups' AND ap.can_manage_game_topups = true) OR
        (_permission = 'betting' AND ap.can_manage_betting = true) OR
        (_permission = 'phone_topups' AND ap.can_manage_phone_topups = true) OR
        (_permission = 'view' AND ap.can_view_orders = true)
      )
  )
$$;

-- Create function to process phone topup order
CREATE OR REPLACE FUNCTION public.process_phone_topup_order(
  _operator_id uuid,
  _phone_number text,
  _amount numeric,
  _notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _balance numeric;
  _operator record;
  _order_id uuid;
BEGIN
  -- Check if user is authenticated
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'يجب تسجيل الدخول');
  END IF;
  
  -- Get operator info
  SELECT * INTO _operator FROM phone_operators WHERE id = _operator_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'شركة الاتصال غير موجودة');
  END IF;
  
  -- Validate amount
  IF _amount < _operator.min_amount THEN
    RETURN json_build_object('success', false, 'error', 'الحد الأدنى للشحن هو ' || _operator.min_amount || ' د.ج');
  END IF;
  
  IF _amount > _operator.max_amount THEN
    RETURN json_build_object('success', false, 'error', 'الحد الأقصى للشحن هو ' || _operator.max_amount || ' د.ج');
  END IF;
  
  -- Get user balance
  SELECT balance INTO _balance FROM user_balances WHERE user_id = _user_id;
  IF _balance IS NULL OR _balance < _amount THEN
    RETURN json_build_object('success', false, 'error', 'رصيدك غير كافي');
  END IF;
  
  -- Deduct balance
  UPDATE user_balances SET balance = balance - _amount, updated_at = now() WHERE user_id = _user_id;
  
  -- Create order
  INSERT INTO phone_topup_orders (user_id, operator_id, phone_number, amount, notes)
  VALUES (_user_id, _operator_id, _phone_number, _amount, _notes)
  RETURNING id INTO _order_id;
  
  RETURN json_build_object(
    'success', true,
    'order_id', _order_id,
    'message', 'تم إرسال طلب الشحن بنجاح'
  );
END;
$$;

-- Create function to approve phone topup order
CREATE OR REPLACE FUNCTION public.approve_phone_topup_order(
  _order_id uuid,
  _admin_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _processor_id uuid := auth.uid();
  _order record;
BEGIN
  -- Check permissions
  IF NOT (has_role(_processor_id, 'admin') OR agent_can(_processor_id, 'phone_topups')) THEN
    RETURN json_build_object('success', false, 'error', 'ليس لديك صلاحية');
  END IF;
  
  -- Get order
  SELECT * INTO _order FROM phone_topup_orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;
  
  IF _order.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'تم معالجة هذا الطلب مسبقاً');
  END IF;
  
  -- Update order
  UPDATE phone_topup_orders
  SET status = 'approved',
      admin_notes = _admin_notes,
      processed_at = now(),
      processed_by = _processor_id,
      updated_at = now()
  WHERE id = _order_id;
  
  RETURN json_build_object('success', true, 'message', 'تم قبول الطلب بنجاح');
END;
$$;

-- Create function to reject phone topup order
CREATE OR REPLACE FUNCTION public.reject_phone_topup_order(
  _order_id uuid,
  _admin_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _processor_id uuid := auth.uid();
  _order record;
BEGIN
  -- Check permissions
  IF NOT (has_role(_processor_id, 'admin') OR agent_can(_processor_id, 'phone_topups')) THEN
    RETURN json_build_object('success', false, 'error', 'ليس لديك صلاحية');
  END IF;
  
  -- Get order
  SELECT * INTO _order FROM phone_topup_orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;
  
  IF _order.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'تم معالجة هذا الطلب مسبقاً');
  END IF;
  
  -- Refund balance
  UPDATE user_balances SET balance = balance + _order.amount, updated_at = now() WHERE user_id = _order.user_id;
  
  -- Update order
  UPDATE phone_topup_orders
  SET status = 'rejected',
      admin_notes = _admin_notes,
      processed_at = now(),
      processed_by = _processor_id,
      updated_at = now()
  WHERE id = _order_id;
  
  RETURN json_build_object('success', true, 'message', 'تم رفض الطلب وإرجاع المبلغ');
END;
$$;