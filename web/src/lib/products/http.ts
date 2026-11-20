import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { rightsFor } from '@/lib/auth/rights';
import type { CurrentUser } from '@/lib/auth/permissions';
import { ProductError } from './service';
import type { ProductErrors } from './validate';

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
export async function authorizeProductWrite(req: Request, rightName: string): Promise<WriteAuth> {
  const auth = await authorizeApi('products');
  if (!auth.ok) return auth;

  const rights = await rightsFor(auth.user);
  if (!rights.has(rightName)) {
    return { ok: false, response: json(403, 'FORBIDDEN', `You do not have the "${rightName}" right.`) };
  }

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

export const validationFailed = (errors: ProductErrors) =>
  json(400, 'VALIDATION', 'Please fix the highlighted fields. Nothing was saved.', { errors });

/** Known business errors become 404 / 409; returns null for anything else so the caller can use fail(e). */
export function productErrorResponse(e: unknown): NextResponse | null {
  if (!(e instanceof ProductError)) return null;
  return json(e.code === 'NOT_FOUND' ? 404 : 409, e.code, e.message);
}
