-- Add is_deleted column for soft delete functionality
ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_offers_is_deleted ON offers(is_deleted);