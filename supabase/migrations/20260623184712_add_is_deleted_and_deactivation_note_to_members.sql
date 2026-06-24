-- Add is_deleted and deactivation_note columns to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS deactivation_note TEXT;
