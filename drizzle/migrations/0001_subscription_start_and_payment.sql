ALTER TABLE public.subscriptions ADD COLUMN start_date date;
ALTER TABLE public.subscriptions ADD COLUMN payment_method text CHECK (payment_method IS NULL OR char_length(payment_method) <= 40);