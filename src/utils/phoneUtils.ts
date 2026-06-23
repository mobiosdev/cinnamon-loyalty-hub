/**
 * Utility functions for handling Sri Lankan phone numbers
 * All numbers are stored in database in format: 94XXXXXXXXX (no + sign)
 * Accepts input formats: +94, 94, 07, 7
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized?: string;
  error?: string;
}

/**
 * Validates and normalizes a Sri Lankan mobile number
 * @param input - Phone number in any format (+94, 94, 07, 7)
 * @returns Validation result with normalized number in 94XXXXXXXXX format
 */
export function validateAndNormalizeSriLankanMobile(input: string): PhoneValidationResult {
  if (!input || typeof input !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove all spaces, dashes, and other non-digit characters except +
  let cleaned = input.trim().replace(/[\s\-()]/g, '');
  
  // Remove + if present
  cleaned = cleaned.replace(/^\+/, '');
  
  // Check if it's all digits now
  if (!/^\d+$/.test(cleaned)) {
    return { isValid: false, error: 'Phone number must contain only digits' };
  }

  let normalized = '';

  // Handle different formats
  if (cleaned.startsWith('94')) {
    // Format: 94XXXXXXXXX
    normalized = cleaned;
    if (normalized.length !== 11) {
      return { isValid: false, error: 'Invalid phone number length for 94 format (should be 11 digits)' };
    }
  } else if (cleaned.startsWith('0')) {
    // Format: 07XXXXXXXX (10 digits)
    if (cleaned.length !== 10) {
      return { isValid: false, error: 'Invalid phone number length (should be 10 digits with 0)' };
    }
    // Remove leading 0 and add 94
    normalized = '94' + cleaned.substring(1);
  } else if (cleaned.startsWith('7')) {
    // Format: 7XXXXXXXX (9 digits)
    if (cleaned.length !== 9) {
      return { isValid: false, error: 'Invalid phone number length (should be 9 digits without 0)' };
    }
    // Add 94
    normalized = '94' + cleaned;
  } else {
    return { isValid: false, error: 'Phone number must start with 94, 0, or 7' };
  }

  // Validate the mobile prefix (after 94, should start with 7)
  const mobilePrefix = normalized.substring(2, 3);
  if (mobilePrefix !== '7') {
    return { isValid: false, error: 'Not a valid Sri Lankan mobile number (must start with 7 after country code)' };
  }

  // Validate the operator prefix (4th digit after 94)
  const operatorPrefix = normalized.substring(3, 4);
  const validOperatorPrefixes = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  if (!validOperatorPrefixes.includes(operatorPrefix)) {
    return { isValid: false, error: 'Invalid mobile operator prefix' };
  }

  return { isValid: true, normalized };
}

/**
 * Format a phone number for display
 * @param phone - Phone number in 94XXXXXXXXX format
 * @returns Formatted phone number like +94 77 123 4567
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';
  
  // Remove any non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('94') && cleaned.length === 11) {
    // Format as +94 77 123 4567
    return `+94 ${cleaned.substring(2, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
  }
  
  return phone; // Return as-is if format is unexpected
}

/**
 * Mask a phone number for privacy (show only last 3 digits)
 * @param phone - Phone number in any format
 * @returns Masked phone number like +94 77****567
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('94') && cleaned.length === 11) {
    // Show as +94 77****567
    return `+94 ${cleaned.substring(2, 4)}****${cleaned.substring(8)}`;
  }
  
  // Fallback for unexpected formats
  if (cleaned.length >= 3) {
    const lastThree = cleaned.slice(-3);
    const maskedPart = '*'.repeat(Math.max(0, cleaned.length - 3));
    return maskedPart + lastThree;
  }
  
  return phone;
}

/**
 * Check if two phone numbers are the same (handles different formats)
 * @param phone1 - First phone number
 * @param phone2 - Second phone number
 * @returns True if both numbers are the same
 */
export function arePhoneNumbersEqual(phone1: string, phone2: string): boolean {
  const result1 = validateAndNormalizeSriLankanMobile(phone1);
  const result2 = validateAndNormalizeSriLankanMobile(phone2);
  
  if (!result1.isValid || !result2.isValid) return false;
  
  return result1.normalized === result2.normalized;
}
