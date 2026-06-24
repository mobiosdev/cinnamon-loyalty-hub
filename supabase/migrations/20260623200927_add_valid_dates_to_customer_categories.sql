-- Add valid_from and valid_to columns to customer_categories table
ALTER TABLE customer_categories ADD COLUMN IF NOT EXISTS valid_from DATE;
ALTER TABLE customer_categories ADD COLUMN IF NOT EXISTS valid_to DATE;
