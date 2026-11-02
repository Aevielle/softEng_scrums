import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const COOKIE = 'session';
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET);

export type SessionData = { sub: string; role: string; mustChange: boolean };

export async function createSession(data: SessionData, remember = false) {
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
  const token = await new SignJWT({ ...data })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${maxAge}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // "Remember me" off = browser-session cookie (no maxAge)
    ...(remember ? { maxAge } : {}),
  });
}

export async function getSession(): Promise<SessionData | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}