import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

export interface PhoneValidationResult {
  isValid: boolean;
  normalized?: string;
  error?: string;
}

/**
 * Validates and normalizes any phone number using libphonenumber-js
 * Handles formats like +94, 94, 07, 7, etc.
 * Stored format: XXXXXXXXX (no leading +)
 */
export function validateAndNormalizeSriLankanMobile(input: string): PhoneValidationResult {
  if (!input || typeof input !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }

  const cleaned = input.trim();

  // If it starts with '+', parse it directly
  if (cleaned.startsWith('+')) {
    const phoneNumber = parsePhoneNumberFromString(cleaned);
    if (phoneNumber && phoneNumber.isValid()) {
      return { isValid: true, normalized: phoneNumber.number.replace(/^\+/, '') };
    }
    return { isValid: false, error: 'Invalid international phone number' };
  }

  // If it starts with '0', we try to parse it with LK country code (default)
  if (cleaned.startsWith('0')) {
    const phoneNumber = parsePhoneNumberFromString(cleaned, 'LK');
    if (phoneNumber && phoneNumber.isValid()) {
      return { isValid: true, normalized: phoneNumber.number.replace(/^\+/, '') };
    }
    return { isValid: false, error: 'Invalid local phone number' };
  }

  // Prepend '+' and try parsing
  const withPlus = '+' + cleaned;
  const parsedWithPlus = parsePhoneNumberFromString(withPlus);
  if (parsedWithPlus && parsedWithPlus.isValid()) {
    return { isValid: true, normalized: parsedWithPlus.number.replace(/^\+/, '') };
  }

  // Fallback as LK number
  const parsedLK = parsePhoneNumberFromString(cleaned, 'LK');
  if (parsedLK && parsedLK.isValid()) {
    return { isValid: true, normalized: parsedLK.number.replace(/^\+/, '') };
  }

  return { isValid: false, error: 'Invalid phone number' };
}

// Reuse the same logic for validateAndNormalizeSriLankanPhone to accept all kinds of numbers
export function validateAndNormalizeSriLankanPhone(input: string): PhoneValidationResult {
  return validateAndNormalizeSriLankanMobile(input);
}

/**
 * Format a phone number for display using libphonenumber-js
 * @param phone - Phone number in any format (e.g. 94777000057)
 * @returns Formatted phone number (e.g. +94 77 700 0057)
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  const phoneNumber = parsePhoneNumberFromString('+' + cleaned);
  if (phoneNumber && phoneNumber.isValid()) {
    return phoneNumber.formatInternational();
  }
  
  // Fallback
  if (cleaned.startsWith('94') && cleaned.length === 11) {
    return `+94 ${cleaned.substring(2, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
  }
  
  return phone;
}

/**
 * Mask a phone number for privacy
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  const phoneNumber = parsePhoneNumberFromString('+' + cleaned);
  if (phoneNumber && phoneNumber.isValid()) {
    const countryCallingCode = phoneNumber.countryCallingCode;
    const national = phoneNumber.nationalNumber;
    if (national.length > 5) {
      const maskedNational = national.substring(0, 2) + '*'.repeat(national.length - 5) + national.slice(-3);
      return `+${countryCallingCode} ${maskedNational}`;
    }
  }
  
  // Fallback
  if (cleaned.startsWith('94') && cleaned.length === 11) {
    return `+94 ${cleaned.substring(2, 4)}****${cleaned.substring(8)}`;
  }
  
  if (cleaned.length >= 3) {
    const lastThree = cleaned.slice(-3);
    const maskedPart = '*'.repeat(Math.max(0, cleaned.length - 3));
    return maskedPart + lastThree;
  }
  
  return phone;
}

/**
 * Check if two phone numbers are the same
 */
export function arePhoneNumbersEqual(phone1: string, phone2: string): boolean {
  const result1 = validateAndNormalizeSriLankanMobile(phone1);
  const result2 = validateAndNormalizeSriLankanMobile(phone2);
  
  if (!result1.isValid || !result2.isValid) return false;
  
  return result1.normalized === result2.normalized;
}

/**
 * Splits a unified phone number into country prefix, local number, and country code
 */
export function splitPhoneNumber(phone: string): { prefix: string; number: string; countryCode: CountryCode } {
  if (!phone || typeof phone !== 'string') {
    return { prefix: '94', number: '', countryCode: 'LK' };
  }

  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  const parsed = parsePhoneNumberFromString(cleaned);
  if (parsed && parsed.isValid()) {
    return {
      prefix: parsed.countryCallingCode,
      number: parsed.nationalNumber as string,
      countryCode: (parsed.country || 'LK') as CountryCode
    };
  }

  // Fallback for incomplete numbers:
  const withoutPlus = cleaned.replace(/^\+/, '');
  
  if (withoutPlus.startsWith('94')) return { prefix: '94', number: withoutPlus.substring(2), countryCode: 'LK' };
  if (withoutPlus.startsWith('91')) return { prefix: '91', number: withoutPlus.substring(2), countryCode: 'IN' };
  if (withoutPlus.startsWith('44')) return { prefix: '44', number: withoutPlus.substring(2), countryCode: 'GB' };
  if (withoutPlus.startsWith('1')) return { prefix: '1', number: withoutPlus.substring(1), countryCode: 'US' };

  return { prefix: '94', number: withoutPlus, countryCode: 'LK' };
}
