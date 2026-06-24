-- Add is_recurrent and usage_limit columns to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_recurrent BOOLEAN DEFAULT false;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS usage_limit INTEGER DEFAULT NULL;
