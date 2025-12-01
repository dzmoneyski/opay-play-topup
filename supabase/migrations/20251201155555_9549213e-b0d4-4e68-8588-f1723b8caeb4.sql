-- Enable realtime for digital_card_orders table
-- This ensures complete row data is captured during updates
ALTER TABLE public.digital_card_orders REPLICA IDENTITY FULL;