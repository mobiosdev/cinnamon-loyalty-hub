-- Create discount_redemptions table to track discount usage
CREATE TABLE IF NOT EXISTS public.discount_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  bill_number TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  discount_type TEXT NOT NULL, -- 'percentage' or 'fixed'
  discount_value NUMERIC NOT NULL, -- percentage or amount
  discount_amount NUMERIC, -- actual discount amount applied (for percentage, calculated value)
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  redeemed_by INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discount_redemptions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all access
CREATE POLICY "Allow all access to discount_redemptions" 
ON public.discount_redemptions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_discount_redemptions_phone ON public.discount_redemptions(customer_phone);
CREATE INDEX idx_discount_redemptions_member ON public.discount_redemptions(member_id);
CREATE INDEX idx_discount_redemptions_date ON public.discount_redemptions(redeemed_at DESC);
