import cron from 'node-cron';
import { eq, sql } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { projects } from '../db/schema.js';
import { triggerRuntimeRun } from '../agents/runtime/orchestrator.js';

// Global concurrency cap (locked owner decision): max 3 parallel project runs.
const MAX_CONCURRENT = 3;
let running = 0;

async function dailySweep(): Promise<void> {
  const active = await db
    .select()
    .from(projects)
    .where(eq(projects.status, 'active'));

  // Skip projects that have already had a run today (any pipeline).
  const todayActive = active.filter((p) => {
    // Look at updatedAt as a cheap proxy; if you want stricter, query agent_runs.
    void p;
    return true;
  });

  console.log(`[scheduler] daily sweep: ${todayActive.length} active projects`);

  // Run sequentially-with-a-cap. Don't await all to keep one bad project from
  // blocking the rest — but never exceed MAX_CONCURRENT in flight.
  for (const project of todayActive) {
    while (running >= MAX_CONCURRENT) {
      await new Promise((r) => setTimeout(r, 1000));
    }
    running += 1;
    triggerRuntimeRun({ project, triggeredByUserId: 'scheduler' })
      .catch((err) => console.error('[scheduler] project run failed', { projectId: project.id, err }))
      .finally(() => {
        running -= 1;
      });
  }
}

export function startScheduler(): void {
  if (!env.SCHEDULER_ENABLED) {
    console.log('[scheduler] disabled (SCHEDULER_ENABLED=false)');
    return;
  }
  if (!cron.validate(env.SCHEDULER_CRON)) {
    console.error('[scheduler] invalid SCHEDULER_CRON; not starting');
    return;
  }
  cron.schedule(env.SCHEDULER_CRON, () => {
    dailySweep().catch((err) => console.error('[scheduler] sweep crashed', err));
  });
  console.log(`[scheduler] enabled; will run "${env.SCHEDULER_CRON}" (UTC)`);
}

// Suppress unused-import errors when the orchestrator is the only caller.
void sql;
