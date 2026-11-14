// The same checks Register uses (Marie's mockup: empty fields, then email format),
// shared by the Add/Edit forms (browser) and the API routes (server).

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // identical to the Register route

export const normalizeEmail = (e: string) => e.trim().toLowerCase();

export type FieldProblem = {
  title: string; // short heading, shown in bold in the toast
  message: string;
  fields: ('firstName' | 'lastName' | 'email' | 'role')[]; // inputs to highlight
};

export type Checked =
  | { ok: true; value: { firstName: string; lastName: string; email: string } }
  | { ok: false; error: FieldProblem };

export function validateUserInput(input: { firstName?: unknown; lastName?: unknown; email?: unknown }): Checked {
  const firstName = typeof input.firstName === 'string' ? input.firstName.trim() : '';
  const lastName = typeof input.lastName === 'string' ? input.lastName.trim() : '';
  const email = typeof input.email === 'string' ? normalizeEmail(input.email) : '';

  const empty = (
    [['firstName', firstName], ['lastName', lastName], ['email', email]] as const
  )
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (empty.length) {
    return { ok: false, error: { title: 'Empty Field', message: 'Please fill out the forms.', fields: [...empty] } };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: { title: 'Wrong Email', message: 'Enter valid email address.', fields: ['email'] } };
  }
  if (firstName.length > 100 || lastName.length > 100 || email.length > 254) {
    return { ok: false, error: { title: 'Too long', message: 'Please shorten the highlighted field.', fields: [
      ...(firstName.length > 100 ? (['firstName'] as const) : []),
      ...(lastName.length > 100 ? (['lastName'] as const) : []),
      ...(email.length > 254 ? (['email'] as const) : []),
    ] } };
  }
  return { ok: true, value: { firstName, lastName, email } };
}