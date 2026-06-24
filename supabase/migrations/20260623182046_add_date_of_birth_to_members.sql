-- Add date_of_birth column to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS date_of_birth DATE;
