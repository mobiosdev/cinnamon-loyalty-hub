-- Add discount policy fields to offers table
ALTER TABLE public.offers
ADD COLUMN min_bill_value numeric,
ADD COLUMN max_discount_amount numeric;