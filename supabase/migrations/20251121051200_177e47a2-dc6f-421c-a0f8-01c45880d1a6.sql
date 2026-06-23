-- Create offer redemptions table
CREATE TABLE public.offer_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES public.offers(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  redeemed_by INTEGER NOT NULL,
  bill_number TEXT,
  redeemed_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offer_redemptions ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow all access to offer_redemptions" ON public.offer_redemptions FOR ALL USING (true) WITH CHECK (true);