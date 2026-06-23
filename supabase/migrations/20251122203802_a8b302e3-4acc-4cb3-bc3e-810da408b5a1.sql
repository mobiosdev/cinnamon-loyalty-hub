-- Create a junction table for offer-category relationships (many-to-many)
CREATE TABLE IF NOT EXISTS public.offer_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES public.customer_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(offer_id, category_id)
);

-- Enable RLS
ALTER TABLE public.offer_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow all access to offer_categories" 
ON public.offer_categories 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Migrate existing data from offers.category_id to junction table
INSERT INTO public.offer_categories (offer_id, category_id)
SELECT id, category_id 
FROM public.offers 
WHERE category_id IS NOT NULL
ON CONFLICT (offer_id, category_id) DO NOTHING;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_offer_categories_offer_id ON public.offer_categories(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_categories_category_id ON public.offer_categories(category_id);

-- Drop the member_categories table since we're reverting those changes
DROP TABLE IF EXISTS public.member_categories;