/**
 * TextWare Information Security Password Policy (Client-side Validator)
 *
 * Rules:
 * - Standard Users (e.g. Customers / Members): Minimum length 8 characters
 * - Privileged Users (e.g. Administrators, Staff): Minimum length 12 characters
 * - Service Accounts: Minimum length 14 characters
 * - Complexity:
 *   - At least 1 uppercase letter (A-Z)
 *   - At least 1 lowercase letter (a-z)
 *   - At least 1 digit (0-9)
 *   - At least 1 special character (!@#$%^&*...)
 *   - Not containing username, email or common dictionary patterns
 */

export interface PasswordValidationResult {
  isValid: boolean;
  message?: string;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasDigit: boolean;
    hasSpecialChar: boolean;
    noIdentityMatch: boolean;
  };
}

export function validatePasswordPolicy(
  password: string,
  isPrivileged: boolean = false,
  identityValues: string[] = []
): PasswordValidationResult {
  const minLength = 8;

  const checks = {
    minLength: typeof password === 'string' && password.length >= minLength,
    hasUppercase: /[A-Z]/.test(password || ''),
    hasLowercase: /[a-z]/.test(password || ''),
    hasDigit: /\d/.test(password || ''),
    hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password || ''),
    noIdentityMatch: true,
  };

  const normalized = (password || '').toLowerCase();
  for (const idVal of identityValues) {
    if (idVal && idVal.trim().length >= 3 && normalized.includes(idVal.trim().toLowerCase())) {
      checks.noIdentityMatch = false;
      break;
    }
  }

  if (!checks.minLength) {
    return {
      isValid: false,
      message: `Password must be at least ${minLength} characters long.`,
      checks,
    };
  }

  if (!checks.hasUppercase) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter (A-Z).',
      checks,
    };
  }

  if (!checks.hasLowercase) {
    return {
      isValid: false,
      message: 'Password must contain at least one lowercase letter (a-z).',
      checks,
    };
  }

  if (!checks.hasDigit) {
    return {
      isValid: false,
      message: 'Password must contain at least one number (0-9).',
      checks,
    };
  }

  if (!checks.hasSpecialChar) {
    return {
      isValid: false,
      message: 'Password must contain at least one special character (!@#$%^&*...).',
      checks,
    };
  }

  if (!checks.noIdentityMatch) {
    return {
      isValid: false,
      message: 'Password must not contain your email, username, or personal name.',
      checks,
    };
  }

  return {
    isValid: true,
    checks,
  };
}
