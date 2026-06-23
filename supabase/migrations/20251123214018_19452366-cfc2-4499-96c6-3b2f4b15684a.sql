-- Add reactivation tracking fields to offer_redemptions table
ALTER TABLE offer_redemptions
ADD COLUMN reactivated_at timestamp with time zone,
ADD COLUMN reactivated_by text;

-- Add comment for clarity
COMMENT ON COLUMN offer_redemptions.reactivated_at IS 'Timestamp when the offer was reactivated';
COMMENT ON COLUMN offer_redemptions.reactivated_by IS 'Name or identifier of who reactivated the offer';