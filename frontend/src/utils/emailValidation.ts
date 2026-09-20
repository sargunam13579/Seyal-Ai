/**
 * Strict Gmail Validation Utility.
 * Ensures email addresses strictly conform to Google's official Gmail account specifications.
 */

export interface GmailValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates whether an email string is a valid Gmail address according to Google's username rules:
 * - Domain must be @gmail.com or @googlemail.com.
 * - Username (before @) must be between 6 and 30 characters.
 * - Username may only contain letters (a-z), numbers (0-9), and periods (.).
 * - Username cannot start or end with a period.
 * - Username cannot contain consecutive periods (..).
 */
export const isValidGmail = (email: string): GmailValidationResult => {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'Email address is required.' };
  }

  const clean = email.trim().toLowerCase();

  // Basic email structure check
  const atCount = (clean.match(/@/g) || []).length;
  if (atCount !== 1) {
    return { isValid: false, error: 'Please enter a valid email format.' };
  }

  const [username, domain] = clean.split('@');

  // Enforce Gmail domain only
  if (domain !== 'gmail.com' && domain !== 'googlemail.com') {
    return {
      isValid: false,
      error: 'Only valid @gmail.com accounts are allowed.',
    };
  }

  // Google username length requirement: 6 to 30 characters
  if (username.length < 6) {
    return {
      isValid: false,
      error: 'Gmail username must be at least 6 characters long.',
    };
  }

  if (username.length > 30) {
    return {
      isValid: false,
      error: 'Gmail username cannot exceed 30 characters.',
    };
  }

  // Cannot begin or end with a period
  if (username.startsWith('.') || username.endsWith('.')) {
    return {
      isValid: false,
      error: 'Gmail username cannot start or end with a period.',
    };
  }

  // Cannot contain consecutive periods
  if (username.includes('..')) {
    return {
      isValid: false,
      error: 'Gmail username cannot contain consecutive periods.',
    };
  }

  // Only letters, numbers, and periods are permitted in Gmail usernames
  const validCharsRegex = /^[a-z0-9.]+$/;
  if (!validCharsRegex.test(username)) {
    return {
      isValid: false,
      error: 'Gmail username can only contain letters, numbers, and periods.',
    };
  }

  return { isValid: true };
};
