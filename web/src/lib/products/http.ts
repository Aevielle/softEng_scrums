import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { rightsFor } from '@/lib/auth/rights';
import type { CurrentUser } from '@/lib/auth/permissions';
import { ProductError } from './service';
import { PriceError } from './prices-service';
import type { ProductErrors } from './validate';
import type { PriceErrors } from './prices';

// Shared by POST /api/products and PATCH /api/products/[prodcode], so both apply the same gate in the same order.

type WriteAuth =
  | { ok: true; user: CurrentUser; body: unknown }
  | { ok: false; response: NextResponse };

const json = (status: number, code: string, message: string, extra?: object) =>
  NextResponse.json({ code, message, ...extra }, { status });

/**
 * 1. signed in + "products" module (401 / 403)      2. the specific right, checked here on the server (403)
 * 3. JSON content type (415)                        4. body parses (400)
 * Nothing is validated or saved until all four pass.
 */
export async function authorizeProductWrite(
  req: Request,
  rightName: string,
  opts: { body?: boolean } = {}
): Promise<WriteAuth> {
  const auth = await authorizeApi('products');
  if (!auth.ok) return auth;

  const rights = await rightsFor(auth.user);
  if (!rights.has(rightName)) {
    return { ok: false, response: json(403, 'FORBIDDEN', `You do not have the "${rightName}" right.`) };
  }

  // A request with no body (Delete Price) stops here: rights are already checked, and a cross-site <form>
  // cannot send DELETE anyway.
  if (opts.body === false) return { ok: true, user: auth.user, body: null };

  // A plain cross-site <form> cannot send application/json, so this also blocks that kind of forged request.
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return { ok: false, response: json(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send the product as JSON.') };
  }

  try {
    return { ok: true, user: auth.user, body: await req.json() };
  } catch {
    return { ok: false, response: json(400, 'BAD_JSON', 'The request body is not valid JSON.') };
  }
}

export const validationFailed = (errors: ProductErrors | PriceErrors) =>
  json(400, 'VALIDATION', 'Please fix the highlighted fields. Nothing was saved.', { errors });

/** Known business errors become 404 / 409; returns null for anything else so the caller can use fail(e). */
export function productErrorResponse(e: unknown): NextResponse | null {
  if (!(e instanceof ProductError)) return null;
  return json(e.code === 'NOT_FOUND' ? 404 : 409, e.code, e.message);
}

/**
 * Price errors: 404 for a missing product or price, 409 for everything else.
 * A duplicate date also carries `errors.effdate`, so the dialog can highlight that field.
 */
export function priceErrorResponse(e: unknown): NextResponse | null {
  if (!(e instanceof PriceError)) return null;
  if (e.code === 'NOT_FOUND') return json(404, e.code, e.message);
  if (e.code === 'DUPLICATE_DATE') return json(409, e.code, e.message, { errors: { effdate: e.message } });
  return json(409, e.code, e.message);
}
