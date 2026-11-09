import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';

const key = () => {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET is not set');
  return new TextEncoder().encode(`${s}:reset`); // hiwalay sa session token
};

// Bahagi ng kasalukuyang password hash: kapag nagbago ang password, patay na ang lumang link
export const fingerprint = (passwordHash: string) =>
  createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);

export async function makeResetToken(userId: number, passwordHash: string, seconds: number) {
  return new SignJWT({ purpose: 'reset', fp: fingerprint(passwordHash) })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${seconds}s`)
    .sign(key());
}

export async function readResetToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key());
    if (payload.purpose !== 'reset') return null;
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId)) return null;
    return { userId, fp: String(payload.fp) };
  } catch {
    return null; // expired o peke
  }
}