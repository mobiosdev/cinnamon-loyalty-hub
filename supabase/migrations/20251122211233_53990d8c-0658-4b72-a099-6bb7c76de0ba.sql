-- Add columns to members table to store selected benefits
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS selected_offers jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS discount_enabled boolean DEFAULT true;

COMMENT ON COLUMN public.members.selected_offers IS 'Array of offer IDs that this member has access to';
COMMENT ON COLUMN public.members.discount_enabled IS 'Whether the discount policy benefit is enabled for this member';