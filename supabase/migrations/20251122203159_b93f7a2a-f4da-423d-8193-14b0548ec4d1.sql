-- Create a junction table for member-category relationships (many-to-many)
CREATE TABLE IF NOT EXISTS public.member_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES public.customer_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(member_id, category_id)
);

-- Enable RLS
ALTER TABLE public.member_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow all access to member_categories" 
ON public.member_categories 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Migrate existing data from members.category_id to junction table
INSERT INTO public.member_categories (member_id, category_id)
SELECT id, category_id 
FROM public.members 
WHERE category_id IS NOT NULL
ON CONFLICT (member_id, category_id) DO NOTHING;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_member_categories_member_id ON public.member_categories(member_id);
CREATE INDEX IF NOT EXISTS idx_member_categories_category_id ON public.member_categories(category_id);