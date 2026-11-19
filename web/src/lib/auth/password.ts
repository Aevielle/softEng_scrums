export const PASSWORD_LENGTH_MESSAGE = 'Password must be at least 8 characters.';
export const PASSWORD_RULES_MESSAGE =
  'Use 8+ characters with uppercase, lowercase, a number, and a special character.';

export function validatePassword(password: string): string | null {
  if (password.length < 8) return PASSWORD_LENGTH_MESSAGE;
  if (password.length > 72) return "Password must be 72 characters or fewer."; // bcrypt limit
  if (
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9\s]/.test(password)
  ) {
    return PASSWORD_RULES_MESSAGE;
  }
  return null;
}