import { eq, sql } from 'drizzle-orm';
import { db } from '../index.js';
import { users, type User } from '../schema.js';
import { newId } from '../../lib/id.js';

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);
  return rows[0];
}

export async function findUserById(id: string): Promise<User | undefined> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function upsertUserByEmail(email: string): Promise<User> {
  const existing = await findUserByEmail(email);
  if (existing) {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, existing.id));
    return { ...existing, lastLoginAt: new Date() };
  }
  const id = newId();
  const now = new Date();
  await db.insert(users).values({ id, email, lastLoginAt: now });
  return (await findUserById(id))!;
}
