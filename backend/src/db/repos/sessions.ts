import { and, eq, gt } from 'drizzle-orm';
import { db } from '../index.js';
import { sessions, users, type Session, type User } from '../schema.js';
import { newId } from '../../lib/id.js';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(userId: string): Promise<Session> {
  const id = newId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id, userId, expiresAt });
  return (await findSessionById(id))!;
}

export async function findSessionById(id: string): Promise<Session | undefined> {
  const rows = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return rows[0];
}

export async function findSessionWithUser(id: string): Promise<{ session: Session; user: User } | undefined> {
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0];
}

export async function touchSession(id: string): Promise<void> {
  await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, id));
}

export async function deleteSession(id: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, id));
}
