export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Use more than or equal to 8 characters with letters and numbers.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Use more than or equal to 8 characters with letters and numbers.";
  }
  if (password.length > 72) return "Password limit reached. It must be 72 characters or fewer."; // bcrypt limit
  return null;
}