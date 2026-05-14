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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-sm">
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

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        {/* Top stat strip */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="Last event">
            {lastEvent ? (
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <span className="font-medium">{lastEvent.agentName}</span>
                  <span className="ml-2 font-mono text-xs text-neutral-500">{lastEvent.eventType}</span>
                </div>
                <span className="text-xs text-neutral-500 whitespace-nowrap">
                  {new Date(lastEvent.at).toLocaleTimeString()}
                  {lastEvent.durationMs != null && ` · ${lastEvent.durationMs}ms`}
                </span>
              </div>
            ) : (
              <p className="text-xs text-neutral-400">No events yet. SSE connected.</p>
            )}
          </StatCard>

          <StatCard label="Recent runs">
            {runs.data && runs.data.runs.length > 0 ? (
              <div className="flex items-center gap-1.5">
                {runs.data.runs.slice(0, 12).map((r) => (
                  <span
                    key={r.id}
                    title={`${r.id.slice(0, 8)} · ${r.status}`}
                    className={`inline-block h-2.5 w-2.5 rounded-full ${
                      r.status === 'completed'
                        ? 'bg-emerald-500'
                        : r.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-blue-500 animate-pulse'
                    }`}
                  />
                ))}
                <span className="ml-2 text-xs text-neutral-500">
                  {runs.data.runs.length} total
                </span>
              </div>
            ) : (
              <p className="text-xs text-neutral-400">No runs yet.</p>
            )}
          </StatCard>

          <StatCard label="30-day spend">
            <span className="font-mono text-lg">
              ${runs.data?.monthlySpendUsd?.toFixed(4) ?? '—'}
            </span>
          </StatCard>
        </section>

        {/* Full-width graph */}
        <section>
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-base font-semibold tracking-tight capitalize">{pipelineId} graph</h2>
            {pipelineId === 'runtime' && (
              <div className="flex items-center gap-3">
                {triggerError && (
                  <span className="text-xs text-red-600">{triggerError}</span>
                )}
                <button
                  onClick={() => trigger.mutate()}
                  disabled={trigger.isPending}
                  className="rounded-md bg-neutral-900 text-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
                  title="Real LLM run — produces a Draft, ~$0.005 in tokens"
                >
                  {trigger.isPending ? 'Starting…' : 'Generate now'}
                </button>
              </div>
            )}
          </div>
          {graph.isLoading && <p className="text-sm text-neutral-500">Loading graph…</p>}
          {graph.data && <PipelineGraphView graph={graph.data} nodeStatus={nodeStatus} />}
          <p className="text-xs text-neutral-500 mt-2">
            Nodes pulse when running, turn green on completion, red on failure. A successful runtime
            run produces a Draft in the Drafts queue. Setup must have been run first (so personas
            and themes exist).
          </p>
        </section>

        {/* Runs list */}
        {runs.data && runs.data.runs.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
              Run history
            </h2>
            <div className="rounded-lg border border-neutral-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Run</th>
                    <th className="text-left px-3 py-2 font-medium">Pipeline</th>
                    <th className="text-left px-3 py-2 font-medium">Started</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-left px-3 py-2 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {runs.data.runs.map((r) => (
                    <tr key={r.id} className="hover:bg-neutral-50">
                      <td className="px-3 py-2 font-mono text-xs">{r.id.slice(0, 8)}</td>
                      <td className="px-3 py-2 text-xs text-neutral-600 capitalize">{r.pipeline}</td>
                      <td className="px-3 py-2 text-xs text-neutral-600">
                        {new Date(r.startedAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-xs">
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
                      </td>
                      <td className="px-3 py-2 text-xs text-red-600 max-w-md">
                        {r.error ? <code className="break-all whitespace-pre-wrap">{r.error}</code> : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 mb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}
