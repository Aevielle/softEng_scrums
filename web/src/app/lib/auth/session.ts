import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

type SessionPayload = { sub: string; role: string; mustChange: boolean };

export async function createSession(payload: SessionPayload, remember: boolean) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');

  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8; // 30 days or 8 hours

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(new TextEncoder().encode(secret));

  const store = await cookies();
  store.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}