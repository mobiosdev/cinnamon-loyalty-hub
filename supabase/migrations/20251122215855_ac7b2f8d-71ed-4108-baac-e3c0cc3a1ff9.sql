-- Create table to track phone number views for privacy audit
CREATE TABLE public.phone_number_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  viewer_info text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_number_views ENABLE ROW LEVEL SECURITY;

-- Allow all access (can be restricted later when auth is added)
CREATE POLICY "Allow all access to phone_number_views" 
ON public.phone_number_views 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add index for better query performance
CREATE INDEX idx_phone_number_views_member_id ON public.phone_number_views(member_id);
CREATE INDEX idx_phone_number_views_viewed_at ON public.phone_number_views(viewed_at DESC);