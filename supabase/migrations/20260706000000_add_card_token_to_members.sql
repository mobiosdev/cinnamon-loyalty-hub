-- Add card_token column to members table if it does not exist
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS card_token VARCHAR(30) UNIQUE;

-- Create helper function to generate a 30-character random token
CREATE OR REPLACE FUNCTION public.generate_card_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..30 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update existing members without a card_token
UPDATE public.members 
SET card_token = public.generate_card_token() 
WHERE card_token IS NULL;

-- Set default value for card_token
ALTER TABLE public.members ALTER COLUMN card_token SET DEFAULT public.generate_card_token();
