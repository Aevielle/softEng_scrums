// Shared by the form (browser) and the service (server), so both apply the same rules.
// No server-only imports here: this file is bundled into the browser.

/** Same list as unit_ck in S2-DBA-03. If the DBA list changes, change it here too. */
export const UNITS = ['pcs', 'can', 'pair', 'meter'] as const;
export type Unit = (typeof UNITS)[number];

/** Assumption: confirm against the width of product.description in Supabase. */
export const DESCRIPTION_MAX = 100;

export type ProductInput = { description: string; unit: Unit };
export type ProductErrors = Partial<Record<'description' | 'unit', string>>;

export type ValidationResult =
  | { ok: true; values: ProductInput }
  | { ok: false; errors: ProductErrors };

/** Accepts anything (a request body is untrusted) and returns clean values or one message per bad field. */
export function validateProductInput(raw: unknown): ValidationResult {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const errors: ProductErrors = {};

  // Trim and collapse repeated spaces, so "  Steel   bracket " is saved as "Steel bracket".
  const description = typeof src.description === 'string' ? src.description.replace(/\s+/g, ' ').trim() : '';
  const unit = typeof src.unit === 'string' ? src.unit.trim() : '';

  if (!description) errors.description = 'Description is required.';
  else if (description.length > DESCRIPTION_MAX) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  }

  if (!unit) errors.unit = 'Please choose a unit.';
  else if (!(UNITS as readonly string[]).includes(unit)) {
    errors.unit = `Unit must be one of: ${UNITS.join(', ')}.`;
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, values: { description, unit: unit as Unit } };
}