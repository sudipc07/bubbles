import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useRoute } from 'wouter';
import { api, ApiError } from '../lib/api';
import { useUpdateBrief, type Project } from '../lib/projects';
import { useRunSetup, useSetupOutputs } from '../lib/setup';
import { SetupOutputsView } from '../components/SetupOutputs';

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
      <header className="border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between text-sm">
          <Link href="/" className="text-neutral-500 hover:text-neutral-900">
            ← All projects
          </Link>
          {project && (
            <div className="flex gap-2">
              <Link
                href={`/projects/${project.id}/drafts`}
                className="rounded-md border border-neutral-200 px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Drafts
              </Link>
              <Link
                href={`/projects/${project.id}/pipeline`}
                className="rounded-md border border-neutral-200 px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Pipeline →
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {query.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
        {query.error && <p className="text-sm text-red-600">Could not load project.</p>}
        {project && (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
              <p className="text-sm text-neutral-500 font-mono mt-1">{project.slug}</p>
              <p className="text-xs text-neutral-500 mt-2">
                Status <span className="font-mono">{project.status}</span> · Monthly cost ceiling{' '}
                <span className="font-mono">${project.monthlyCostCeilingUsd}</span>
              </p>
            </div>

            <BriefForm project={project} />
            <hr className="my-10 border-neutral-200" />
            <SetupSection project={project} />
          </>
        )}
      </main>
    </div>
  );
}

function SetupSection({ project }: { project: Project }) {
  const setup = useSetupOutputs(project.id);
  const run = useRunSetup(project.id);
  const briefReady = !!project.brief && project.brief.trim().length >= 30;

  const errorMessage = run.error instanceof ApiError ? run.error.message : null;
  const hasOutputs =
    !!setup.data &&
    (setup.data.audiences.length > 0 ||
      setup.data.personas.length > 0 ||
      setup.data.samples.length > 0 ||
      !!setup.data.brandKit);

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Setup outputs</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Runs all 7 setup agents (Parser → Audience → Voice → Persona → Theme → Brand Kit →
            Sample). About 5-10 seconds, ~$0.003 in LLM cost. Watch the graph live on the Pipeline
            tab.
          </p>
        </div>
        <button
          onClick={() => run.mutate()}
          disabled={!briefReady || run.isPending}
          className="rounded-md bg-neutral-900 text-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 whitespace-nowrap"
          title={!briefReady ? 'Save a brief of at least 30 characters first' : undefined}
        >
          {run.isPending ? 'Starting…' : hasOutputs ? 'Re-run setup' : 'Run setup'}
        </button>
      </div>

      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
      {!briefReady && (
        <p className="text-xs text-amber-700">
          Save a brief above (30+ characters) before running setup. The Parser needs something to
          read.
        </p>
      )}

      {setup.isLoading && <p className="text-xs text-neutral-500">Loading outputs…</p>}

      {setup.data && hasOutputs && <SetupOutputsView data={setup.data} />}
      {setup.data && !hasOutputs && (
        <p className="text-xs text-neutral-400 italic">
          No setup outputs yet. Click "Run setup" once your brief is in.
        </p>
      )}
    </section>
  );
}

function BriefForm({ project }: { project: Project }) {
  const update = useUpdateBrief(project.id);
  const [brief, setBrief] = useState(project.brief ?? '');
  const [logoUrl, setLogoUrl] = useState(project.logoUrl ?? '');
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
    setChannels(project.channels.filter((c) => ALL_CHANNELS.includes(c as Channel)) as Channel[]);
  }, [project.id, project.brief, project.logoUrl, project.channels]);

  const toggleChannel = (ch: Channel) => {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  };

  async function onSave() {
    setSaved(false);
    try {
      await update.mutateAsync({
        brief: brief.trim() === '' ? null : brief,
        logoUrl: logoUrl.trim() === '' ? null : logoUrl.trim(),
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
