import { finishRun, startRun } from '../runAgent.js';
import { runRuntimePipelineStub } from './stubs.js';

export interface TriggerInput {
  projectId: string;
  triggeredByUserId: string;
}

/**
 * Kick off a runtime pipeline run. Returns immediately with the runId; the
 * actual pipeline executes in the background and emits events via SSE.
 *
 * Phase 3.5: uses stub agents. Phase 4 swaps in the real Planner/Writer/etc.
 */
export function triggerRuntimeRun(input: TriggerInput): Promise<{ runId: string }> {
  return startRun({
    projectId: input.projectId,
    pipeline: 'runtime',
    triggeredByUserId: input.triggeredByUserId,
  }).then((ctx) => {
    // Fire-and-forget. Errors are captured and recorded against the run.
    (async () => {
      try {
        await runRuntimePipelineStub(ctx);
        await finishRun(ctx.runId, true);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[pipeline] run failed', { runId: ctx.runId, error: message });
        await finishRun(ctx.runId, false, message).catch(() => {});
      }
    })();
    return { runId: ctx.runId };
  });
}
