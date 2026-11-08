import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export type SessionPayload = { sub: string; role: string; mustChange: boolean };

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload, remember = false) {
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8; // 30 days or 8 hours

  const token = await new SignJWT({
    sub: payload.sub,
    role: payload.role,
    mustChange: payload.mustChange,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(getKey());

  const store = await cookies();
  store.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get('session')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getKey());
    return {
      sub: String(payload.sub),
      role: String(payload.role ?? 'User'),
      mustChange: !!payload.mustChange,
    };
  } catch {
    return null; // expired or tampered
  }
}