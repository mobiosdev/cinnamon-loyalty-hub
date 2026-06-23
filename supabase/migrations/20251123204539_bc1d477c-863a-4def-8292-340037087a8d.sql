-- Add status field to offer_redemptions table to track active/cancelled redemptions
ALTER TABLE offer_redemptions 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' 
CHECK (status IN ('active', 'cancelled'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_offer_redemptions_status 
ON offer_redemptions(status);

-- Add index for combined queries on customer_phone and status
CREATE INDEX IF NOT EXISTS idx_offer_redemptions_customer_status 
ON offer_redemptions(customer_phone, status);