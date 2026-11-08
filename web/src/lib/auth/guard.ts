import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { getCurrentUser, type CurrentUser, type ModuleKey } from '@/lib/auth/permissions';

/** For pages and server components. Call it at the top of EVERY protected page. */
export async function requirePageAccess(key?: ModuleKey): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/');
  if (user.mustChange) redirect('/set-password');
  if (key && !user.allowed.has(key)) redirect(`/dashboard?denied=${key}`);
  return user;
}

type ApiResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; response: NextResponse };

/** For route handlers and server actions. */
export async function authorizeApi(key?: ModuleKey): Promise<ApiResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ code: 'UNAUTHENTICATED', message: 'Not signed in.' }, { status: 401 }),
    };
  }
  if (user.mustChange) {
    return {
      ok: false,
      response: NextResponse.json({ code: 'MUST_CHANGE', message: 'Change your password first.' }, { status: 403 }),
    };
  }
  if (key && !user.allowed.has(key)) {
    return {
      ok: false,
      response: NextResponse.json({ code: 'FORBIDDEN', message: 'You do not have rights for this action.' }, { status: 403 }),
    };
  }
  return { ok: true, user };
}