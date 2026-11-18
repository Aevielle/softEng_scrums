import { randomBytes, createHash } from 'crypto';

export const RESET_TTL_MIN = 15;

// The raw token only ever goes into the email. Only its hash is stored.
export const newToken = () => randomBytes(32).toString('hex');

export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
