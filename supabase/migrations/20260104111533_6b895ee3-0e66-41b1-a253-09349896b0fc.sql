
-- دالة لتنظيف طلبات السحب الزائدة وإرجاع المبالغ
CREATE OR REPLACE FUNCTION public.cleanup_excess_withdrawals()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_record RECORD;
  _withdrawal_record RECORD;
  _current_balance NUMERIC;
  _total_pending NUMERIC;
  _rejected_count INTEGER := 0;
  _refunded_amount NUMERIC := 0;
BEGIN
  -- لكل مستخدم لديه طلبات سحب معلقة
  FOR _user_record IN 
    SELECT user_id, SUM(amount) as total_pending
    FROM withdrawals
    WHERE status = 'pending'
    GROUP BY user_id
    HAVING COUNT(*) > 1  -- أكثر من طلب معلق
  LOOP
    -- الحصول على الرصيد الحالي
    SELECT balance INTO _current_balance
    FROM user_balances
    WHERE user_id = _user_record.user_id;

    _total_pending := 0;

    -- معالجة كل طلب سحب (الأقدم أولاً)
    FOR _withdrawal_record IN 
      SELECT id, amount, created_at
      FROM withdrawals
      WHERE user_id = _user_record.user_id AND status = 'pending'
      ORDER BY created_at ASC
    LOOP
      -- إذا كان هذا أول طلب، نبقيه
      IF _total_pending = 0 THEN
        _total_pending := _withdrawal_record.amount;
      ELSE
        -- رفض الطلبات الزائدة وإرجاع المبلغ
        UPDATE withdrawals
        SET status = 'rejected',
            admin_notes = 'تم الرفض تلقائياً - طلب مكرر',
            processed_at = now()
        WHERE id = _withdrawal_record.id;

        -- إرجاع المبلغ للرصيد
        UPDATE user_balances
        SET balance = balance + _withdrawal_record.amount,
            updated_at = now()
        WHERE user_id = _user_record.user_id;

        _rejected_count := _rejected_count + 1;
        _refunded_amount := _refunded_amount + _withdrawal_record.amount;
      END IF;
    END LOOP;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'rejected_count', _rejected_count,
    'refunded_amount', _refunded_amount
  );
END;
$$;

-- تشغيل الدالة لتنظيف الطلبات الموجودة
SELECT public.cleanup_excess_withdrawals();

-- حذف الدالة بعد الاستخدام (لن نحتاجها مرة أخرى)
DROP FUNCTION IF EXISTS public.cleanup_excess_withdrawals();
