import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useRoute } from 'wouter';
import { api, ApiError } from '../lib/api';
import { useUpdateBrief, type Project } from '../lib/projects';
import { useRunSetup, useSetupOutputs } from '../lib/setup';
import { SetupOutputsView } from '../components/SetupOutputs';
import { useDrafts } from '../lib/drafts';
import { useLivePipeline, useRuns } from '../lib/pipeline';
import { ProjectHeader } from '../components/ProjectHeader';

const ALL_CHANNELS = ['linkedin', 'instagram'] as const;
type Channel = (typeof ALL_CHANNELS)[number];

export function ProjectDetailPage() {
  const [, params] = useRoute('/projects/:id');
  const id = params?.id;
  const query = useQuery({
    enabled: !!id,
    queryKey: ['projects', id],
    queryFn: () => api<{ project: Project }>(`/api/projects/${id}`).then((r) => r.project),
  });
  const project = query.data;

  if (!id) return null;

  return (
    <div className="min-h-screen">
      <ProjectHeader projectId={id} activeTab="overview" />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {query.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
        {query.error && <p className="text-sm text-red-600">Could not load project.</p>}
        {project && (
          <>
            <div className="mb-6">
              <p className="text-xs text-neutral-500 font-mono">{project.slug}</p>
              <p className="text-xs text-neutral-500 mt-1">
                Status <span className="font-mono">{project.status}</span> · Monthly cost ceiling{' '}
                <span className="font-mono">${project.monthlyCostCeilingUsd}</span>
              </p>
            </div>

            <NextSteps project={project} />
            <DashboardStrip project={project} />
            <BriefForm project={project} />
            <hr className="my-10 border-neutral-200" />
            <SetupSection project={project} />
          </>
        )}
      </main>
    </div>
  );
}

const SETUP_NODES = ['parser', 'audience', 'voice', 'persona', 'theme', 'brandkit', 'sample'] as const;
const SETUP_LABELS: Record<string, string> = {
  parser: 'Parser',
  audience: 'Audience Generator',
  voice: 'Voice Generator',
  persona: 'Persona Generator',
  theme: 'Theme Generator',
  brandkit: 'Brand Kit',
  sample: 'Sample Generator',
};

function SetupSection({ project }: { project: Project }) {
  const runs = useRuns(project.id);
  const latestSetupRun = runs.data?.runs.find((r) => r.pipeline === 'setup');
  const isRunning = latestSetupRun?.status === 'running';

  const setup = useSetupOutputs(project.id, isRunning);
  const run = useRunSetup(project.id);
  const { nodeStatus, lastEvent } = useLivePipeline(project.id);

  const briefReady = !!project.brief && project.brief.trim().length >= 30;
  const errorMessage = run.error instanceof ApiError ? run.error.message : null;
  const hasOutputs =
    !!setup.data &&
    (setup.data.audiences.length > 0 ||
      setup.data.personas.length > 0 ||
      setup.data.samples.length > 0 ||
      !!setup.data.brandKit);

  // Setup is in progress if either: server reports a running setup run, or
  // we just kicked one off and the runs list hasn't caught up.
  const showProgress = isRunning || run.isPending;

  const completedSetupNodes = SETUP_NODES.filter((n) => nodeStatus[n] === 'done').length;
  const currentNode = SETUP_NODES.find((n) => nodeStatus[n] === 'running');

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Setup outputs</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Runs all 7 setup agents (Parser → Audience → Voice → Persona → Theme → Brand Kit →
            Sample). About 20-40 seconds, ~$0.003 in LLM cost.
          </p>
        </div>
        <button
          onClick={() => run.mutate()}
          disabled={!briefReady || run.isPending || isRunning}
          className="rounded-md bg-neutral-900 text-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 whitespace-nowrap"
          title={!briefReady ? 'Save a brief of at least 30 characters first' : undefined}
        >
          {showProgress ? 'Running…' : hasOutputs ? 'Re-run setup' : 'Run setup'}
        </button>
      </div>

      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
      {!briefReady && (
        <p className="text-xs text-amber-700">
          Save a brief above (30+ characters) before running setup. The Parser needs something to
          read.
        </p>
      )}

      {showProgress && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-blue-900">
              {currentNode
                ? `Running ${SETUP_LABELS[currentNode] ?? currentNode}…`
                : 'Starting setup pipeline…'}
            </span>
            <span className="font-mono text-blue-700">
              {completedSetupNodes} / {SETUP_NODES.length}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-blue-100 rounded overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${(completedSetupNodes / SETUP_NODES.length) * 100}%` }}
            />
          </div>
          {lastEvent && (
            <p className="mt-2 text-[10px] text-blue-700 font-mono">
              latest: {lastEvent.agentName} · {lastEvent.eventType}
              {lastEvent.durationMs != null && ` · ${lastEvent.durationMs}ms`}
            </p>
          )}
        </div>
      )}

      {setup.isLoading && <p className="text-xs text-neutral-500">Loading outputs…</p>}

      {setup.data && hasOutputs && <SetupOutputsView data={setup.data} projectId={project.id} />}
      {setup.data && !hasOutputs && !showProgress && (
        <p className="text-xs text-neutral-400 italic">
          No setup outputs yet. Click "Run setup" once your brief is in.
        </p>
      )}
    </section>
  );
}

function NextSteps({ project }: { project: Project }) {
  const setup = useSetupOutputs(project.id);
  const drafts = useDrafts(project.id, 'all');

  const briefDone = !!project.brief && project.brief.trim().length >= 30;
  const setupDone =
    !!setup.data && setup.data.personas.length > 0 && setup.data.themes.length > 0;

  const pendingCount = drafts.data?.filter((d) => d.status === 'pending').length ?? 0;
  const totalDrafts = drafts.data?.length ?? 0;

  // Setup is the only milestone that "completes". Generation + review are
  // ongoing — once setup is ready, those become the active workflow.
  const setupTodo = !briefDone || !setupDone;

  return (
    <section className="mb-6 space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
        {setupTodo ? 'Get started' : 'Workflow'}
      </h2>

      {/* One-time setup checklist — collapses to a single done line once both are complete */}
      {setupTodo ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-3 space-y-2">
          <StepRow
            n={1}
            label="Write the brief"
            desc="Paste a PRD or feature list (30+ chars). Used by the setup agents."
            done={briefDone}
            current={!briefDone}
            cta={null}
          />
          <StepRow
            n={2}
            label="Run setup"
            desc="Generates personas, themes, brand kit, and 10 sample posts. One-time per project."
            done={setupDone}
            current={briefDone && !setupDone}
            cta={
              briefDone && !setupDone ? (
                <span className="text-xs text-neutral-500">↓ Run setup below</span>
              ) : null
            }
          />
        </div>
      ) : (
        <p className="text-xs text-emerald-700 flex items-center gap-2 px-1">
          <span className="inline-block h-4 w-4 rounded-full bg-emerald-600 text-white text-[10px] leading-4 text-center">✓</span>
          Brief and setup complete. Use the workflow below to keep generating drafts.
        </p>
      )}

      {/* Ongoing workflow — visible always once setup is done */}
      {setupDone && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mt-3">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-neutral-900">Generate &amp; review drafts</p>
              <p className="text-xs text-neutral-600 mt-0.5">
                {pendingCount > 0
                  ? `${pendingCount} draft${pendingCount === 1 ? '' : 's'} waiting for approval. Generate more anytime.`
                  : totalDrafts === 0
                    ? 'Click Generate now to produce your first draft. Then review and publish.'
                    : 'Generate another draft, or review the ones you have.'}
              </p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Each runtime run takes ~5-10s, costs ~$0.005. Use "⚡ Generate now" in the header (visible on every project page).
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link
                href={`/projects/${project.id}/pipeline`}
                className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
              >
                Open Pipeline
              </Link>
              <Link
                href={`/projects/${project.id}/drafts${pendingCount > 0 ? '?filter=pending' : ''}`}
                className="rounded-md bg-neutral-900 text-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-800"
              >
                Open Drafts {totalDrafts > 0 ? `(${totalDrafts})` : ''}
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StepRow({
  n,
  label,
  desc,
  done,
  current,
  cta,
}: {
  n: number;
  label: string;
  desc: string;
  done: boolean;
  current: boolean;
  cta: React.ReactNode;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-md p-2 ${current ? 'bg-amber-50 border border-amber-200' : ''}`}>
      <span
        className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${
          done
            ? 'bg-emerald-600 text-white'
            : current
              ? 'bg-amber-500 text-white'
              : 'bg-neutral-200 text-neutral-600'
        }`}
      >
        {done ? '✓' : n}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? 'text-neutral-600' : 'text-neutral-900'}`}>{label}</p>
        <p className="text-xs text-neutral-500">{desc}</p>
      </div>
      {current && cta}
    </div>
  );
}

function DashboardStrip({ project }: { project: Project }) {
  const drafts = useDrafts(project.id, 'all');
  const runs = useRuns(project.id);

  const counts = {
    pending: drafts.data?.filter((d) => d.status === 'pending').length ?? 0,
    approved: drafts.data?.filter((d) => d.status === 'approved').length ?? 0,
    posted: drafts.data?.filter((d) => d.status === 'posted').length ?? 0,
  };
  const lastRun = runs.data?.runs[0];

  return (
    <section className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
      <StatCell label="Pending drafts" value={counts.pending} link={`/projects/${project.id}/drafts?filter=pending`} />
      <StatCell label="Approved" value={counts.approved} />
      <StatCell label="Posted" value={counts.posted} />
      <StatCell
        label="30-day spend"
        value={runs.data ? `$${runs.data.monthlySpendUsd.toFixed(4)}` : '—'}
        sub={
          lastRun
            ? `last run: ${new Date(lastRun.startedAt).toLocaleString()} (${lastRun.status})`
            : 'no runs yet'
        }
      />
    </section>
  );
}

function StatCell({
  label,
  value,
  sub,
  link,
}: {
  label: string;
  value: string | number;
  sub?: string;
  link?: string;
}) {
  const body = (
    <div className="rounded-lg border border-neutral-200 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold font-mono">{value}</p>
      {sub && <p className="text-[10px] text-neutral-500 mt-1 truncate">{sub}</p>}
    </div>
  );
  return link ? (
    <Link href={link} className="block hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  );
}

function BriefForm({ project }: { project: Project }) {
  const update = useUpdateBrief(project.id);
  const [brief, setBrief] = useState(project.brief ?? '');
  const [logoUrl, setLogoUrl] = useState(project.logoUrl ?? '');
  const [publicUrl, setPublicUrl] = useState(project.publicUrl ?? '');
  const [channels, setChannels] = useState<Channel[]>(
    (project.channels.filter((c) => ALL_CHANNELS.includes(c as Channel)) as Channel[]) ?? [
      'linkedin',
      'instagram',
    ],
  );
  const [saved, setSaved] = useState(false);

  // Reset local state when the upstream project payload changes (e.g. on initial load).
  useEffect(() => {
    setBrief(project.brief ?? '');
    setLogoUrl(project.logoUrl ?? '');
    setPublicUrl(project.publicUrl ?? '');
    setChannels(project.channels.filter((c) => ALL_CHANNELS.includes(c as Channel)) as Channel[]);
  }, [project.id, project.brief, project.logoUrl, project.publicUrl, project.channels]);

  const toggleChannel = (ch: Channel) => {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  };

  async function onSave() {
    setSaved(false);
    try {
      await update.mutateAsync({
        brief: brief.trim() === '' ? null : brief,
        logoUrl: logoUrl.trim() === '' ? null : logoUrl.trim(),
        publicUrl: publicUrl.trim() === '' ? null : publicUrl.trim(),
        channels,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // Error surfaced below via update.error
    }
  }

  const dirty =
    (project.brief ?? '') !== brief ||
    (project.logoUrl ?? '') !== logoUrl.trim() ||
    (project.publicUrl ?? '') !== publicUrl.trim() ||
    project.channels.slice().sort().join(',') !== channels.slice().sort().join(',');

  const errorMessage = update.error instanceof ApiError ? update.error.message : null;

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-base font-semibold tracking-tight">Brief</h2>
          <p className="text-xs text-neutral-500">
            Paste the PRD, product description, or feature list. The setup-time agents (Parser,
            Audience, Voice, Persona, Theme) consume this in Phase 4.
          </p>
        </div>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={14}
          placeholder={`What does this product do?
Who is it for?
What problems does it solve?
What are the core features?
What is the brand voice like?
Anything else worth knowing — past content, off-limits topics, competitors to differentiate from...`}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        <p className="mt-1 text-xs text-neutral-400">{brief.length.toLocaleString()} characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="logoUrl">
          Logo URL
        </label>
        <input
          id="logoUrl"
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://example.com/logo.png"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        <p className="mt-1 text-xs text-neutral-500">
          For now, paste a public URL. Direct upload to S3 lands with the Brand Kit step.
        </p>
        {logoUrl && (
          <div className="mt-3 inline-flex items-center gap-3 rounded-md border border-neutral-200 p-2">
            <img
              src={logoUrl}
              alt="Logo preview"
              className="h-12 w-12 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="text-xs text-neutral-500">preview</span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="publicUrl">
          Public URL
        </label>
        <input
          id="publicUrl"
          type="url"
          value={publicUrl}
          onChange={(e) => setPublicUrl(e.target.value)}
          placeholder="https://resume-folio.app"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Appears at the bottom of CTA slides and on the project lockup. Leave blank to omit.
        </p>
      </div>

      <div>
        <p className="block text-sm font-medium mb-1.5">Channels</p>
        <div className="flex gap-2">
          {ALL_CHANNELS.map((ch) => {
            const active = channels.includes(ch);
            return (
              <button
                key={ch}
                type="button"
                onClick={() => toggleChannel(ch)}
                className={`rounded-md border px-3 py-1.5 text-sm capitalize ${
                  active
                    ? 'bg-neutral-900 border-neutral-900 text-white'
                    : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {ch}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-neutral-200 pt-4">
        <button
          onClick={onSave}
          disabled={!dirty || update.isPending || channels.length === 0}
          className="rounded-md bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
        >
          {update.isPending ? 'Saving…' : 'Save brief'}
        </button>
        {saved && <span className="text-xs text-emerald-700">Saved.</span>}
        {errorMessage && <span className="text-xs text-red-600">{errorMessage}</span>}
        {!dirty && !saved && !errorMessage && project.brief && (
          <span className="text-xs text-neutral-500">Up to date.</span>
        )}
      </div>
    </section>
  );
}
