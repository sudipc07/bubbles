import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../index.js';
import { agentRuns, llmCalls, projects, users } from '../schema.js';

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'paused' | 'archived';
  ownerEmail: string;
  monthlyCostCeilingUsd: number;
  monthlySpendUsd: number;
  lastRunAt: string | null;
  lastRunStatus: 'running' | 'completed' | 'failed' | null;
  createdAt: string;
}

export async function listAllTenants(): Promise<TenantRow[]> {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      status: projects.status,
      monthlyCostCeilingUsd: projects.monthlyCostCeilingUsd,
      ownerEmail: users.email,
      createdAt: projects.createdAt,
      monthlySpendUsd: sql<string>`coalesce((
        select sum(${llmCalls.usdCost})
        from ${llmCalls}
        where ${llmCalls.projectId} = ${projects.id}
          and ${llmCalls.createdAt} >= now() - interval '30 days'
      ), 0)`,
      lastRunAt: sql<string | null>`(
        select to_char(${agentRuns.startedAt}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        from ${agentRuns}
        where ${agentRuns.projectId} = ${projects.id}
        order by ${agentRuns.startedAt} desc
        limit 1
      )`,
      lastRunStatus: sql<'running' | 'completed' | 'failed' | null>`(
        select ${agentRuns.status}
        from ${agentRuns}
        where ${agentRuns.projectId} = ${projects.id}
        order by ${agentRuns.startedAt} desc
        limit 1
      )`,
    })
    .from(projects)
    .innerJoin(users, eq(projects.ownerUserId, users.id))
    .orderBy(desc(projects.createdAt));

  return rows.map((r) => ({
    ...r,
    createdAt: new Date(r.createdAt as unknown as string).toISOString(),
    monthlySpendUsd: Number(r.monthlySpendUsd),
  }));
}

export async function platformSpendUsd(windowDays: number): Promise<number> {
  const rows = await db
    .select({
      total: sql<string>`coalesce(sum(${llmCalls.usdCost}), 0)`,
    })
    .from(llmCalls)
    .where(sql`${llmCalls.createdAt} >= now() - (${windowDays} * interval '1 day')`);
  return Number(rows[0]?.total ?? 0);
}
