import { Router } from 'express';
import { z } from 'zod';
import { generateLoginCode, hashCode, LOGIN_CODE_MAX_ATTEMPTS } from '../../lib/codes.js';
import { findLatestActiveCode, incrementAttempts, insertLoginCode, markCodeUsed } from '../../db/repos/loginCodes.js';
import { upsertUserByEmail } from '../../db/repos/users.js';
import { createSession, deleteSession, SESSION_TTL_MS } from '../../db/repos/sessions.js';
import { loginCodeEmail, sendEmail } from '../../email/ses.js';
import { clearSessionCookie, requireUser, setSessionCookie } from '../middleware/session.js';

export const auth = Router();

const requestSchema = z.object({ email: z.string().email().max(255) });

auth.post('/request-code', async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_email' });
    return;
  }
  const email = parsed.data.email.trim();
  const code = generateLoginCode();
  await insertLoginCode(email, hashCode(code));
  try {
    await sendEmail(loginCodeEmail(email, code));
  } catch (err) {
    console.error('[auth] send email failed', err);
    res.status(502).json({ error: 'email_send_failed' });
    return;
  }
  res.json({ ok: true });
});

const verifySchema = z.object({
  email: z.string().email().max(255),
  code: z.string().regex(/^\d{6}$/),
});

auth.post('/verify', async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input' });
    return;
  }
  const { email, code } = parsed.data;
  const record = await findLatestActiveCode(email);
  if (!record) {
    res.status(400).json({ error: 'no_active_code' });
    return;
  }
  if (record.attempts >= LOGIN_CODE_MAX_ATTEMPTS) {
    res.status(429).json({ error: 'too_many_attempts' });
    return;
  }
  if (hashCode(code) !== record.codeHash) {
    await incrementAttempts(record.id);
    res.status(400).json({ error: 'invalid_code' });
    return;
  }
  await markCodeUsed(record.id);
  const user = await upsertUserByEmail(email);
  const session = await createSession(user.id);
  setSessionCookie(res, session.id, SESSION_TTL_MS);
  res.json({ ok: true, user: { id: user.id, email: user.email, isAdmin: user.isAdmin } });
});

auth.get('/me', requireUser, (req, res) => {
  const u = req.user!;
  res.json({ user: { id: u.id, email: u.email, name: u.name, isAdmin: u.isAdmin } });
});

auth.post('/logout', async (req, res) => {
  if (req.session) await deleteSession(req.session.id);
  clearSessionCookie(res);
  res.json({ ok: true });
});
