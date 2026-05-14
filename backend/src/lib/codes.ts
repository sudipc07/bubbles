import { createHash, randomInt } from 'node:crypto';

// 6-digit numeric login codes. Hashed with sha256 (codes are short-lived; bcrypt is overkill).

export function generateLoginCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export const LOGIN_CODE_TTL_MS = 10 * 60 * 1000;
export const LOGIN_CODE_MAX_ATTEMPTS = 5;
