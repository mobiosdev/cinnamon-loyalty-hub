-- Add member_code column to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS member_code TEXT;

-- Create a unique index on member_code
CREATE UNIQUE INDEX IF NOT EXISTS members_member_code_unique ON members(member_code);

-- Function to generate member code
CREATE OR REPLACE FUNCTION generate_member_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a code like MEM001234
    new_code := 'MEM' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM members WHERE member_code = new_code) INTO code_exists;
    
    -- If code doesn't exist, return it
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update existing members without member_code
UPDATE members 
SET member_code = generate_member_code()
WHERE member_code IS NULL;

-- Create trigger to auto-generate member_code for new members
CREATE OR REPLACE FUNCTION set_member_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.member_code IS NULL THEN
    NEW.member_code := generate_member_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_member_code
  BEFORE INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION set_member_code();