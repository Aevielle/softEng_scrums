export const PASSWORD_RULES_MESSAGE =
  "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.";

// One source of truth for Register, Set password, and Reset password
export function validatePassword(pw: unknown): string | null {
  const ok =
    typeof pw === "string" &&
    pw.length >= 8 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /\d/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw);

  return ok ? null : PASSWORD_RULES_MESSAGE;
}