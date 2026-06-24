-- Fix function search paths for security
CREATE OR REPLACE FUNCTION generate_member_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_num BIGINT;
  next_num BIGINT;
  default_start_num CONSTANT BIGINT := 1002003000; -- default starting number if no member (e.g. 1002003000, 1002003001)
BEGIN
  -- Get the maximum numeric suffix from codes matching 'CG<digits>'
  SELECT MAX(SUBSTRING(member_code FROM '^CG([0-9]+)$')::BIGINT)
  INTO max_num
  FROM members
  WHERE member_code ~ '^CG[0-9]+$';

  IF max_num IS NULL OR max_num < default_start_num THEN
    next_num := default_start_num;
  ELSE
    next_num := max_num + 1;
  END IF;

  RETURN 'CG' || LPAD(next_num::TEXT, 10, '0');
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