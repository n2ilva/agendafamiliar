/**
 * Utility functions for family-related operations
 */

/**
 * Sanitizes and formats a family invite code
 * - Removes non-alphanumeric characters
 * - Converts to uppercase
 * - Limits to 6 characters
 */
export const sanitizeInviteCode = (value: string): string => {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
};

/**
 * Validates if a family invite code is valid
 * A valid code must be exactly 6 alphanumeric characters
 */
export const isValidInviteCode = (code: string): boolean => {
  return /^[A-Z0-9]{6}$/.test(code);
};
