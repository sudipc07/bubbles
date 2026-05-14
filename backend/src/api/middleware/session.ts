import type { NextFunction, Request, Response } from 'express';
import { parse, serialize } from 'cookie';
import { env } from '../../config/env.js';
import { findSessionWithUser, touchSession } from '../../db/repos/sessions.js';
import type { Session, User } from '../../db/schema.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
    }
  }
}

export const SESSION_COOKIE = 'bubbles_session';

export function readSessionCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const parsed = parse(header);
  return parsed[SESSION_COOKIE];
}

export function setSessionCookie(res: Response, sessionId: string, maxAgeMs: number): void {
  res.setHeader(
    'Set-Cookie',
    serialize(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(maxAgeMs / 1000),
    }),
  );
}

export function clearSessionCookie(res: Response): void {
  res.setHeader(
    'Set-Cookie',
    serialize(SESSION_COOKIE, '', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    }),
  );
}

export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const sid = readSessionCookie(req);
  if (!sid) return next();
  try {
    const found = await findSessionWithUser(sid);
    if (found) {
      req.session = found.session;
      req.user = found.user;
      // Fire-and-forget; don't await.
      touchSession(found.session.id).catch(() => {});
    }
  } catch (err) {
    console.error('[session] attach failed', err);
  }
  next();
}

export function requireUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (!req.user.isAdmin) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  next();
}
