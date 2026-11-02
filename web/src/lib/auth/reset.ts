import crypto from 'crypto';

export const RESET_TTL_MIN = Number(process.env.RESET_TOKEN_TTL_MIN ?? 15);

// Random token goes in the email link. Only its hash goes in the database.
export const newToken = () => crypto.randomBytes(32).toString('hex');
export const hashToken = (t: string) =>
  crypto.createHash('sha256').update(t).digest('hex');