import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '../index.js';
import { agentEvents, agentRuns, llmCalls, type AgentEvent, type AgentRun, type LlmCall } from '../schema.js';

export async function listRunsForProject(projectId: string, limit = 25): Promise<AgentRun[]> {
  return db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.projectId, projectId))
    .orderBy(desc(agentRuns.startedAt))
    .limit(limit);
}

export async function getRunForProject(
  runId: string,
  projectId: string,
): Promise<{ run: AgentRun; events: AgentEvent[]; calls: LlmCall[] } | undefined> {
  const rows = await db
    .select()
    .from(agentRuns)
    .where(and(eq(agentRuns.id, runId), eq(agentRuns.projectId, projectId)))
    .limit(1);
  const run = rows[0];
  if (!run) return undefined;

  const events = await db
    .select()
    .from(agentEvents)
    .where(eq(agentEvents.runId, runId))
    .orderBy(asc(agentEvents.createdAt));

  const calls = await db.select().from(llmCalls).where(eq(llmCalls.runId, runId));

  return { run, events, calls };
}

export async function projectMonthlySpendUsd(projectId: string): Promise<number> {
  const rows = await db
    .select({
      total: sql<string>`coalesce(sum(${llmCalls.usdCost}), 0)`,
    })
    .from(llmCalls)
    .where(
      and(
        eq(llmCalls.projectId, projectId),
        sql`${llmCalls.createdAt} >= now() - interval '30 days'`,
      ),
    );
  return Number(rows[0]?.total ?? 0);
}
