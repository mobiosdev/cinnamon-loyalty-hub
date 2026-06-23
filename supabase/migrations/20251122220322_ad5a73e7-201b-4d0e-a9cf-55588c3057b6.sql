-- Create audit logs table for tracking all user activities
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  action text NOT NULL,
  details jsonb,
  ip_address text,
  user_agent text,
  performed_by text,
  performed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow all access
CREATE POLICY "Allow all access to audit_logs" 
ON public.audit_logs 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add indexes for better query performance
CREATE INDEX idx_audit_logs_activity_type ON public.audit_logs(activity_type);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_performed_at ON public.audit_logs(performed_at DESC);
CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs(entity_id);

-- Add comment for documentation
COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit trail for all system activities including CRUD operations on members, companies, categories, offers, and redemptions';