import { db } from '../db/index.js';
import { agentEvents, agentRuns } from '../db/schema.js';
import { newId } from '../lib/id.js';
import { publish } from '../lib/eventBus.js';
import { isKnownNode } from './graph.js';

export interface RunContext {
  runId: string;
  projectId: string;
  pipeline: 'setup' | 'runtime';
}

export async function startRun(input: {
  projectId: string;
  pipeline: 'setup' | 'runtime';
  triggeredByUserId?: string | null;
}): Promise<RunContext> {
  const runId = newId();
  await db.insert(agentRuns).values({
    id: runId,
    projectId: input.projectId,
    pipeline: input.pipeline,
    status: 'running',
    triggeredByUserId: input.triggeredByUserId ?? null,
  });
  return { runId, projectId: input.projectId, pipeline: input.pipeline };
}

export async function finishRun(runId: string, ok: boolean, error?: string): Promise<void> {
  const status = ok ? 'completed' : 'failed';
  await db
    .update(agentRuns)
    .set({ status, finishedAt: new Date(), error: error ?? null })
    .where(eq(agentRuns.id, runId));
}

import { eq } from 'drizzle-orm';

export interface RunAgentInput<I, O> {
  ctx: RunContext;
  nodeId: string;
  agentName: string;
  input: I;
  fn: (input: I) => Promise<O>;
}

export async function runAgent<I, O>(spec: RunAgentInput<I, O>): Promise<O> {
  if (!isKnownNode(spec.nodeId)) {
    throw new Error(`runAgent: unknown node "${spec.nodeId}" — declare it in agents/graph.ts first`);
  }
  const startedAt = Date.now();

  await db.insert(agentEvents).values({
    id: newId(),
    runId: spec.ctx.runId,
    projectId: spec.ctx.projectId,
    nodeId: spec.nodeId,
    agentName: spec.agentName,
    eventType: 'started',
    input: spec.input as unknown,
  });
  publish({
    runId: spec.ctx.runId,
    projectId: spec.ctx.projectId,
    nodeId: spec.nodeId,
    agentName: spec.agentName,
    eventType: 'started',
    at: new Date().toISOString(),
  });

  try {
    const output = await spec.fn(spec.input);
    const durationMs = Date.now() - startedAt;
    await db.insert(agentEvents).values({
      id: newId(),
      runId: spec.ctx.runId,
      projectId: spec.ctx.projectId,
      nodeId: spec.nodeId,
      agentName: spec.agentName,
      eventType: 'finished',
      input: spec.input as unknown,
      output: output as unknown,
      durationMs,
    });
    publish({
      runId: spec.ctx.runId,
      projectId: spec.ctx.projectId,
      nodeId: spec.nodeId,
      agentName: spec.agentName,
      eventType: 'finished',
      durationMs,
      at: new Date().toISOString(),
    });
    return output;
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const errorMessage = err instanceof Error ? err.message : String(err);
    await db.insert(agentEvents).values({
      id: newId(),
      runId: spec.ctx.runId,
      projectId: spec.ctx.projectId,
      nodeId: spec.nodeId,
      agentName: spec.agentName,
      eventType: 'failed',
      input: spec.input as unknown,
      errorMessage,
      durationMs,
    });
    publish({
      runId: spec.ctx.runId,
      projectId: spec.ctx.projectId,
      nodeId: spec.nodeId,
      agentName: spec.agentName,
      eventType: 'failed',
      durationMs,
      errorMessage,
      at: new Date().toISOString(),
    });
    throw err;
  }
}
