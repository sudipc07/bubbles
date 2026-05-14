import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '../index.js';
import { loginCodes, type LoginCode } from '../schema.js';
import { newId } from '../../lib/id.js';
import { LOGIN_CODE_TTL_MS } from '../../lib/codes.js';

export async function insertLoginCode(email: string, codeHash: string): Promise<void> {
  const expiresAt = new Date(Date.now() + LOGIN_CODE_TTL_MS);
  await db.insert(loginCodes).values({ id: newId(), email, codeHash, expiresAt });
}

export async function findLatestActiveCode(email: string): Promise<LoginCode | undefined> {
  const rows = await db
    .select()
    .from(loginCodes)
    .where(
      and(
        sql`lower(${loginCodes.email}) = lower(${email})`,
        isNull(loginCodes.usedAt),
        gt(loginCodes.expiresAt, new Date()),
      ),
    )
    .orderBy(sql`${loginCodes.createdAt} desc`)
    .limit(1);
  return rows[0];
}

export async function markCodeUsed(id: string): Promise<void> {
  await db.update(loginCodes).set({ usedAt: new Date() }).where(eq(loginCodes.id, id));
}

export async function incrementAttempts(id: string): Promise<number> {
  const rows = await db
    .update(loginCodes)
    .set({ attempts: sql`${loginCodes.attempts} + 1` })
    .where(eq(loginCodes.id, id))
    .returning({ attempts: loginCodes.attempts });
  return rows[0]?.attempts ?? 0;
}
