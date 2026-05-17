import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { ApiError } from '../lib/api';
import { useGraph, useLivePipeline, useRuns, useTriggerRun } from '../lib/pipeline';
import { useSetupOutputs } from '../lib/setup';
import { PipelineGraphView } from '../components/PipelineGraph';
import { ProjectHeader } from '../components/ProjectHeader';

export function PipelinePage() {
  const [, params] = useRoute('/projects/:id/pipeline');
  const projectId = params?.id;
  const [pipelineId, setPipelineId] = useState<'setup' | 'runtime'>('runtime');
  const graph = useGraph(pipelineId);
  const runs = useRuns(projectId);
  const { nodeStatus, lastEvent, events } = useLivePipeline(projectId);
  const trigger = useTriggerRun(projectId);
  const triggerError = trigger.error instanceof ApiError ? trigger.error.message : null;
  const setup = useSetupOutputs(projectId);
  const setupReady =
    !!setup.data && setup.data.personas.length > 0 && setup.data.themes.length > 0;

  // Most-recent run first. Only events seen in this browser session — older
  // events live in agent_events; clicking a row in the runs history table
  // will load that run's events from the DB (future enhancement).
  const eventsByRun = new Map<string, typeof events>();
  for (const e of events) {
    const list = eventsByRun.get(e.runId);
    if (list) list.push(e);
    else eventsByRun.set(e.runId, [e]);
  }
  const runIdsInOrder = Array.from(eventsByRun.keys()).reverse();

  if (!projectId) return null;

  const graphToggle = (
    <div className="inline-flex rounded-md border border-border-color overflow-hidden text-xs">
      {(['runtime', 'setup'] as const).map((p) => (
        <button
          key={p}
          onClick={() => setPipelineId(p)}
          className={`px-3 py-1.5 font-medium capitalize ${
            pipelineId === p ? 'bg-primary text-white' : 'bg-surface text-muted hover:bg-surface-2'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen">
      <ProjectHeader projectId={projectId} page="GENERATE" rightSlot={graphToggle} />

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        {/* Primary CTA — Generate Post */}
        <section className="rounded-lg border border-border-color bg-surface p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold tracking-tight">Run the pipeline</h1>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted mt-1">
                {setupReady
                  ? 'Each click fires the 9-agent runtime pipeline · ~$0.005 in tokens · produces 1 draft'
                  : 'Brand setup must be completed first. Open BRAND on the left.'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {triggerError && (
                <span className="font-mono text-[10px] uppercase tracking-wider text-accent-red">
                  [ERROR] {triggerError}
                </span>
              )}
              {!setupReady ? (
                <Link
                  href={`/projects/${projectId}/brand`}
                  className="btn-bracket border border-border-color text-muted px-4 py-2 hover:text-text-primary hover:border-text-primary transition-colors"
                >
                  GO_TO_BRAND →
                </Link>
              ) : (
                <button
                  onClick={() => trigger.mutate()}
                  disabled={trigger.isPending}
                  className="btn-bracket bg-primary text-white px-5 py-2.5 text-sm hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  {trigger.isPending ? 'GENERATING' : 'GENERATE_POST'}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Top stat strip */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="Live events">
            {lastEvent ? (
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <span className="font-medium">{lastEvent.agentName}</span>
                  <span className="ml-2 font-mono text-xs text-muted">{lastEvent.eventType}</span>
                </div>
                <span className="text-xs text-muted whitespace-nowrap">
                  {events.length} total
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted">SSE connected. No events yet.</p>
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
                        ? 'bg-accent-emerald/100'
                        : r.status === 'failed'
                          ? 'bg-accent-red/100'
                          : 'bg-accent-cyan/100 animate-pulse'
                    }`}
                  />
                ))}
                <span className="ml-2 text-xs text-muted">
                  {runs.data.runs.length} total
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted">No runs yet.</p>
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
            {triggerError && <span className="text-xs text-accent-red">{triggerError}</span>}
          </div>
          {graph.isLoading && <p className="text-sm text-muted">Loading graph…</p>}
          {graph.data && <PipelineGraphView graph={graph.data} nodeStatus={nodeStatus} />}
          <p className="text-xs text-muted mt-2">
            Nodes pulse when running, turn green on completion, red on failure. A successful runtime
            run produces a Draft in the Drafts queue.
          </p>
          {pipelineId === 'runtime' && !setupReady && (
            <p className="text-xs text-accent-amber mt-1">
              Setup isn't ready yet — go back to the project, save a brief, and run setup. Generate
              now will be enabled once at least one persona and one theme exist.
            </p>
          )}
        </section>

        {/* Live event timeline (this session) */}
        {events.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
              Event timeline · this session
            </h2>
            <div className="rounded-lg border border-border-color overflow-hidden divide-y divide-border-color max-h-96 overflow-y-auto">
              {runIdsInOrder.map((runId) => {
                const runEvents = eventsByRun.get(runId)!;
                const startedAt = runEvents[0]?.at;
                return (
                  <div key={runId} className="p-3 bg-surface-2/40">
                    <div className="flex items-baseline justify-between text-xs mb-2">
                      <span className="font-mono text-muted">
                        run {runId.slice(0, 8)}
                      </span>
                      <span className="text-muted">
                        {startedAt ? new Date(startedAt).toLocaleString() : ''}
                      </span>
                    </div>
                    <ol className="space-y-0.5">
                      {runEvents.map((e, i) => (
                        <li
                          key={`${e.nodeId}-${e.eventType}-${i}`}
                          className="text-xs grid grid-cols-[80px_120px_1fr_auto] gap-2 font-mono"
                        >
                          <span className="text-muted">
                            {new Date(e.at).toLocaleTimeString([], { hour12: false })}
                          </span>
                          <span
                            className={
                              e.eventType === 'finished'
                                ? 'text-accent-emerald'
                                : e.eventType === 'failed'
                                  ? 'text-accent-red'
                                  : e.eventType === 'started'
                                    ? 'text-accent-cyan'
                                    : 'text-muted'
                            }
                          >
                            {e.eventType}
                          </span>
                          <span className="font-sans font-medium text-text-primary">
                            {e.agentName}
                          </span>
                          <span className="text-muted">
                            {e.durationMs != null ? `${e.durationMs}ms` : ''}
                          </span>
                          {e.errorMessage && (
                            <span className="col-span-4 text-accent-red font-sans pl-[210px] break-all">
                              ↳ {e.errorMessage}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted mt-1">
              Live events received in this browser session. Refreshing clears the list (DB has the
              full history; clicking a run below will show its events in a future update).
            </p>
          </section>
        )}

        {/* Runs list */}
        {runs.data && runs.data.runs.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
              Run history
            </h2>
            <div className="rounded-lg border border-border-color overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Run</th>
                    <th className="text-left px-3 py-2 font-medium">Pipeline</th>
                    <th className="text-left px-3 py-2 font-medium">Started</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-left px-3 py-2 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {runs.data.runs.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-2">
                      <td className="px-3 py-2 font-mono text-xs">{r.id.slice(0, 8)}</td>
                      <td className="px-3 py-2 text-xs text-muted capitalize">{r.pipeline}</td>
                      <td className="px-3 py-2 text-xs text-muted">
                        {new Date(r.startedAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={
                            r.status === 'completed'
                              ? 'text-accent-emerald'
                              : r.status === 'failed'
                                ? 'text-accent-red'
                                : 'text-accent-cyan'
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-accent-red max-w-md">
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
    <div className="rounded-lg border border-border-color p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}
