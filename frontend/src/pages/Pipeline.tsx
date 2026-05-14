import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { ApiError } from '../lib/api';
import { useGraph, useLivePipeline, useRuns, useTriggerRun } from '../lib/pipeline';
import { PipelineGraphView } from '../components/PipelineGraph';

export function PipelinePage() {
  const [, params] = useRoute('/projects/:id/pipeline');
  const projectId = params?.id;
  const [pipelineId, setPipelineId] = useState<'setup' | 'runtime'>('runtime');
  const graph = useGraph(pipelineId);
  const runs = useRuns(projectId);
  const { nodeStatus, lastEvent } = useLivePipeline(projectId);
  const trigger = useTriggerRun(projectId);
  const triggerError = trigger.error instanceof ApiError ? trigger.error.message : null;

  if (!projectId) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <Link href={`/projects/${projectId}`} className="text-neutral-500 hover:text-neutral-900">
              ← Project
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="font-medium">Pipeline</span>
          </div>
          <div className="inline-flex rounded-md border border-neutral-200 overflow-hidden text-xs">
            {(['runtime', 'setup'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPipelineId(p)}
                className={`px-3 py-1.5 font-medium capitalize ${
                  pipelineId === p ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-semibold tracking-tight capitalize">{pipelineId} graph</h2>
              {pipelineId === 'runtime' && (
                <button
                  onClick={() => trigger.mutate()}
                  disabled={trigger.isPending}
                  className="rounded-md bg-neutral-900 text-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
                >
                  {trigger.isPending ? 'Starting…' : 'Run demo pipeline'}
                </button>
              )}
            </div>
            {graph.isLoading && <p className="text-sm text-neutral-500">Loading graph…</p>}
            {graph.data && <PipelineGraphView graph={graph.data} nodeStatus={nodeStatus} />}
            <p className="text-xs text-neutral-500 mt-3">
              Nodes pulse when running, turn green on completion, red on failure. The demo pipeline
              uses stub agents (no LLM calls) so you can watch the wiring end-to-end. Real agents
              land in Phase 4.
            </p>
            {triggerError && (
              <p className="text-xs text-red-600 mt-2">Could not start run: {triggerError}</p>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-lg border border-neutral-200 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                Last event
              </h3>
              {lastEvent ? (
                <div className="text-sm space-y-1">
                  <p>
                    <span className="font-mono text-neutral-500">{lastEvent.eventType}</span>{' '}
                    <span className="font-medium">{lastEvent.agentName}</span>
                  </p>
                  <p className="text-xs text-neutral-500">
                    {new Date(lastEvent.at).toLocaleTimeString()}
                    {lastEvent.durationMs != null && ` · ${lastEvent.durationMs}ms`}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-neutral-400">No events yet. SSE connected.</p>
              )}
            </div>

            <div className="rounded-lg border border-neutral-200 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                Runs (last 25)
              </h3>
              {runs.isLoading && <p className="text-xs text-neutral-500">Loading…</p>}
              {runs.data && runs.data.runs.length === 0 && (
                <p className="text-xs text-neutral-400">No runs yet.</p>
              )}
              {runs.data && runs.data.runs.length > 0 && (
                <ul className="space-y-1.5 text-xs">
                  {runs.data.runs.map((r) => (
                    <li key={r.id} className="flex justify-between">
                      <span className="font-mono text-neutral-500">{r.id.slice(0, 8)}</span>
                      <span
                        className={
                          r.status === 'completed'
                            ? 'text-emerald-700'
                            : r.status === 'failed'
                              ? 'text-red-700'
                              : 'text-blue-700'
                        }
                      >
                        {r.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {runs.data && (
                <p className="mt-3 text-xs text-neutral-500">
                  30-day spend: <span className="font-mono">${runs.data.monthlySpendUsd.toFixed(4)}</span>
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
