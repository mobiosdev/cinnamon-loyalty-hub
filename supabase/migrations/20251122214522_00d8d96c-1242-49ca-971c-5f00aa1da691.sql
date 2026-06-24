-- Fix function search paths for security
CREATE OR REPLACE FUNCTION generate_member_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_num INTEGER;
  next_num INTEGER;
  default_start_num CONSTANT INTEGER := 1; -- default starting number if no member (e.g. 1, 2, 100)
BEGIN
  -- Get the maximum numeric suffix from codes matching 'MEM<digits>'
  SELECT MAX(SUBSTRING(member_code FROM '^MEM([0-9]+)$')::INTEGER)
  INTO max_num
  FROM members
  WHERE member_code ~ '^MEM[0-9]+$';

  IF max_num IS NULL THEN
    next_num := default_start_num;
  ELSE
    next_num := max_num + 1;
  END IF;

  RETURN 'MEM' || LPAD(next_num::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION set_member_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.member_code IS NULL THEN
    NEW.member_code := generate_member_code();
  END IF;
  RETURN NEW;
END;
$$;