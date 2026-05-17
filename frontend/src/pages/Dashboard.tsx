import { useQuery } from '@tanstack/react-query';
import { Link, useRoute } from 'wouter';
import { api } from '../lib/api';
import { useDrafts } from '../lib/drafts';
import { useLivePipeline, useRuns } from '../lib/pipeline';
import { useSetupOutputs } from '../lib/setup';
import type { Project } from '../lib/projects';
import { ProjectHeader } from '../components/ProjectHeader';

export function DashboardPage() {
  const [, params] = useRoute('/projects/:id');
  const id = params?.id;

  const query = useQuery({
    enabled: !!id,
    queryKey: ['projects', id],
    queryFn: () => api<{ project: Project }>(`/api/projects/${id}`).then((r) => r.project),
  });

  if (!id) return null;
  const project = query.data;

  return (
    <div className="min-h-full">
      <ProjectHeader projectId={id} page="DASHBOARD" />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {query.isLoading && (
          <p className="font-mono text-xs uppercase tracking-wider text-muted">[LOADING] // Project</p>
        )}
        {query.error && (
          <p className="font-mono text-xs uppercase tracking-wider text-accent-red">[ERROR] Could not load project</p>
        )}
        {project && <DashboardBody project={project} />}
      </main>
    </div>
  );
}

function DashboardBody({ project }: { project: Project }) {
  const drafts = useDrafts(project.id, 'all');
  const runs = useRuns(project.id);
  const setup = useSetupOutputs(project.id);
  const { events } = useLivePipeline(project.id);

  const allDrafts = drafts.data ?? [];
  const pending = allDrafts.filter((d) => d.status === 'pending').length;
  const approved = allDrafts.filter((d) => d.status === 'approved').length;
  const posted = allDrafts.filter((d) => d.status === 'posted').length;
  const rejected = allDrafts.filter((d) => d.status === 'rejected').length;

  const decided = approved + rejected;
  const approvalRate = decided === 0 ? null : Math.round((approved / decided) * 100);
  const totalDrafts = allDrafts.length;
  const monthlySpend = runs.data?.monthlySpendUsd ?? 0;

  const recentRuns = runs.data?.runs ?? [];
  const failingRuns = recentRuns.filter((r) => r.status === 'failed').slice(0, 5);
  const failingDrafts = allDrafts.filter((d) => d.safetyVerdict === 'fail' || d.empathyVerdict === 'tone_deaf').slice(0, 5);

  const setupReady = !!setup.data && setup.data.personas.length > 0 && setup.data.themes.length > 0;

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Telemetry Overview</h1>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted mt-1">
          {project.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')} ·{' '}
          STATUS: <span className="text-text-primary">{project.status}</span> ·{' '}
          CAP: <span className="text-text-primary">${project.monthlyCostCeilingUsd}</span> ·{' '}
          {setupReady ? (
            <span className="text-accent-emerald">SETUP_READY</span>
          ) : (
            <span className="text-accent-amber">SETUP_PENDING</span>
          )}
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* Left column — stats + flags */}
        <div className="space-y-4">
          {/* Stats grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="POSTS_GEN" value={totalDrafts} sub={`${posted} posted`} />
            <StatCard
              label="APPROVAL"
              value={approvalRate === null ? '—' : `${approvalRate}%`}
              sub={decided === 0 ? 'no decisions yet' : `${approved} / ${decided}`}
              accent={approvalRate !== null && approvalRate >= 80 ? 'emerald' : approvalRate !== null && approvalRate >= 50 ? 'amber' : 'red'}
            />
            <StatCard
              label="NEEDS_REVIEW"
              value={pending}
              sub={pending === 0 ? 'queue clear' : 'awaiting approve/reject'}
              accent={pending > 0 ? 'amber' : 'muted'}
              link={`/projects/${project.id}/drafts?filter=pending`}
            />
            <StatCard
              label="30D_SPEND"
              value={`$${monthlySpend.toFixed(4)}`}
              sub={`cap $${project.monthlyCostCeilingUsd}`}
              accent={monthlySpend > project.monthlyCostCeilingUsd * 0.8 ? 'red' : 'cyan'}
            />
          </section>

          {/* Recent flags */}
          <section className="rounded-lg border border-border-color bg-surface p-4">
            <h2 className="font-mono text-[10px] uppercase tracking-wider text-muted mb-3">RECENT_FLAGS</h2>
            {failingRuns.length === 0 && failingDrafts.length === 0 ? (
              <p className="font-mono text-xs text-muted">[OK] // No flags in this project</p>
            ) : (
              <ul className="space-y-2">
                {failingRuns.map((r) => (
                  <li key={r.id} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-accent-red text-[18px] mt-0.5">error</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] uppercase tracking-wider text-text-primary">
                        RUN_{r.id.slice(0, 6)} · {r.pipeline} · FAILED
                      </p>
                      {r.error && (
                        <p className="font-mono text-[10px] text-accent-red truncate">{r.error}</p>
                      )}
                      <p className="font-mono text-[10px] text-muted">
                        {new Date(r.startedAt).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
                {failingDrafts.map((d) => (
                  <li key={d.id} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-accent-amber text-[18px] mt-0.5">warning</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] uppercase tracking-wider text-text-primary truncate">
                        DRF_{d.id.slice(0, 6)} · {d.empathyVerdict === 'tone_deaf' ? 'TONE_DEAF' : 'SAFETY_FAIL'}
                      </p>
                      <p className="text-xs text-muted truncate">{d.topicTitle}</p>
                      <Link
                        href={`/projects/${project.id}/drafts/${d.id}`}
                        className="font-mono text-[10px] text-accent-cyan hover:underline"
                      >
                        OPEN_INSPECTOR →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent posts */}
          <section className="rounded-lg border border-border-color bg-surface p-4">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-mono text-[10px] uppercase tracking-wider text-muted">RECENT_POSTS</h2>
              <Link
                href={`/projects/${project.id}/drafts`}
                className="font-mono text-[10px] uppercase tracking-wider text-accent-cyan hover:underline"
              >
                view all →
              </Link>
            </div>
            {allDrafts.length === 0 ? (
              <p className="font-mono text-xs text-muted">
                [EMPTY] // No drafts yet. Use [GENERATE_POST] in the header.
              </p>
            ) : (
              <ul className="space-y-1">
                {allDrafts.slice(0, 6).map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/projects/${project.id}/drafts/${d.id}`}
                      className="block px-3 py-2 -mx-3 rounded hover:bg-surface-2/60 transition-colors"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm text-text-primary truncate">{d.topicTitle}</p>
                        <span className={`status-pill ${pillForStatus(d.status)}`}>{d.status}</span>
                      </div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted mt-0.5">
                        DRF_{d.id.slice(0, 6)} · {d.format.replace('_', ' ')} ·{' '}
                        {new Date(d.createdAt).toLocaleString()}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right rail — SYSTEM_LOG */}
        <aside className="rounded-lg border border-border-color bg-surface flex flex-col max-h-[calc(100vh-220px)] sticky top-[140px]">
          <header className="px-4 py-3 border-b border-border-color flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted">SYSTEM_LOG</p>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-emerald animate-pulse" />
              LIVE
            </span>
          </header>
          <div className="flex-1 overflow-y-auto scroll-thin p-3 space-y-1 font-mono text-[11px]">
            {events.length === 0 && (
              <p className="text-muted">Connection secure. No events yet.</p>
            )}
            {events
              .slice()
              .reverse()
              .map((e, i) => (
                <p key={`${e.runId}-${e.nodeId}-${e.eventType}-${i}`} className="leading-tight">
                  <span className="text-muted">{fmtTime(e.at)}</span>{' '}
                  <span className="text-accent-cyan">[{e.agentName.toUpperCase().replace(/\s+/g, '_')}]</span>{' '}
                  <span
                    className={
                      e.eventType === 'finished'
                        ? 'text-accent-emerald'
                        : e.eventType === 'failed'
                          ? 'text-accent-red'
                          : 'text-muted'
                    }
                  >
                    {e.eventType}
                  </span>
                  {e.durationMs != null && <span className="text-muted"> · {e.durationMs}ms</span>}
                </p>
              ))}
          </div>
        </aside>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
  link,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'cyan' | 'amber' | 'emerald' | 'red' | 'muted';
  link?: string;
}) {
  const accentClass = {
    cyan: 'text-accent-cyan',
    amber: 'text-accent-amber',
    emerald: 'text-accent-emerald',
    red: 'text-accent-red',
    muted: 'text-text-primary',
  }[accent ?? 'muted'];
  const body = (
    <div className="rounded-lg border border-border-color bg-surface p-4 hover:border-accent-cyan/50 transition-colors">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1.5 font-display text-3xl font-bold ${accentClass}`}>{value}</p>
      {sub && <p className="font-mono text-[10px] uppercase tracking-wider text-muted mt-1 truncate">{sub}</p>}
    </div>
  );
  return link ? (
    <Link href={link} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

function pillForStatus(status: 'pending' | 'approved' | 'rejected' | 'posted'): string {
  return status === 'approved' || status === 'posted'
    ? 'status-pill-emerald'
    : status === 'rejected'
      ? 'status-pill-red'
      : 'status-pill-amber';
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
