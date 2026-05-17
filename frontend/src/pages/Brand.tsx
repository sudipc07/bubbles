import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { api, ApiError } from '../lib/api';
import { useUpdateBrief, type Project } from '../lib/projects';
import { useRunSetup, useSetupOutputs } from '../lib/setup';
import { useLivePipeline, useRuns } from '../lib/pipeline';
import { ProjectHeader } from '../components/ProjectHeader';
import { ChooseWizard } from '../components/ChooseWizard';

const ALL_CHANNELS = ['linkedin', 'instagram'] as const;
type Channel = (typeof ALL_CHANNELS)[number];

const SETUP_NODES = ['parser', 'audience', 'voice', 'persona', 'theme', 'brandkit', 'sample'] as const;
const SETUP_LABELS: Record<string, string> = {
  parser: 'PARSER',
  audience: 'AUDIENCE',
  voice: 'VOICE',
  persona: 'PERSONA',
  theme: 'THEME',
  brandkit: 'BRAND_KIT',
  sample: 'SAMPLE',
};

export function BrandPage() {
  const [, params] = useRoute('/projects/:id/brand');
  const id = params?.id;
  const query = useQuery({
    enabled: !!id,
    queryKey: ['projects', id],
    queryFn: () => api<{ project: Project }>(`/api/projects/${id}`).then((r) => r.project),
  });
  const project = query.data;

  if (!id) return null;

  return (
    <div className="min-h-full">
      <ProjectHeader projectId={id} page="BRAND" />
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        {query.isLoading && (
          <p className="font-mono text-xs uppercase tracking-wider text-muted">[LOADING] // Project</p>
        )}
        {project && (
          <>
            <BriefForm project={project} />
            <CandidatesSection project={project} />
          </>
        )}
      </main>
    </div>
  );
}

// ───────── Brief form ─────────

function BriefForm({ project }: { project: Project }) {
  const update = useUpdateBrief(project.id);
  const [brief, setBrief] = useState(project.brief ?? '');
  const [logoUrl, setLogoUrl] = useState(project.logoUrl ?? '');
  const [publicUrl, setPublicUrl] = useState(project.publicUrl ?? '');
  const [channels, setChannels] = useState<Channel[]>(
    (project.channels.filter((c) => ALL_CHANNELS.includes(c as Channel)) as Channel[]) ?? ['linkedin', 'instagram'],
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setBrief(project.brief ?? '');
    setLogoUrl(project.logoUrl ?? '');
    setPublicUrl(project.publicUrl ?? '');
    setChannels(project.channels.filter((c) => ALL_CHANNELS.includes(c as Channel)) as Channel[]);
  }, [project.id, project.brief, project.logoUrl, project.publicUrl, project.channels]);

  const toggleChannel = (ch: Channel) =>
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    await update.mutateAsync({
      brief: brief.trim() === '' ? null : brief,
      logoUrl: logoUrl.trim() === '' ? null : logoUrl.trim(),
      publicUrl: publicUrl.trim() === '' ? null : publicUrl.trim(),
      channels,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const dirty =
    (project.brief ?? '') !== brief ||
    (project.logoUrl ?? '') !== logoUrl.trim() ||
    (project.publicUrl ?? '') !== publicUrl.trim() ||
    project.channels.slice().sort().join(',') !== channels.slice().sort().join(',');

  const errorMessage = update.error instanceof ApiError ? update.error.message : null;

  return (
    <section className="space-y-4">
      <header>
        <h2 className="font-display text-2xl font-bold tracking-tight">Brand brief</h2>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted mt-1">
          INPUT // Source-of-truth for every setup-time agent
        </p>
      </header>

      <form onSubmit={onSave} className="space-y-5">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-wider text-muted block mb-1.5">
            BRIEF
          </label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={14}
            placeholder={'What does this product do?\nWho is it for?\nWhat problems does it solve?\nWhat are the core features?\nWhat is the brand voice like?\nAnything else worth knowing'}
            className="w-full bg-surface-2 border border-border-color rounded px-3 py-2 text-sm font-mono leading-relaxed text-text-primary placeholder-muted focus:outline-none focus:border-accent-cyan transition-colors"
          />
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">
            {brief.length.toLocaleString()} chars
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-muted block mb-1.5" htmlFor="logoUrl">
              LOGO_URL
            </label>
            <input
              id="logoUrl"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full bg-surface-2 border border-border-color rounded px-3 py-2 text-sm font-mono text-text-primary placeholder-muted focus:outline-none focus:border-accent-cyan transition-colors"
            />
            {logoUrl && (
              <div className="mt-2 inline-flex items-center gap-2 rounded border border-border-color p-2">
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="h-10 w-10 object-contain"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                />
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted">preview</span>
              </div>
            )}
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-muted block mb-1.5" htmlFor="publicUrl">
              PUBLIC_URL
            </label>
            <input
              id="publicUrl"
              type="url"
              value={publicUrl}
              onChange={(e) => setPublicUrl(e.target.value)}
              placeholder="https://resume-folio.app"
              className="w-full bg-surface-2 border border-border-color rounded px-3 py-2 text-sm font-mono text-text-primary placeholder-muted focus:outline-none focus:border-accent-cyan transition-colors"
            />
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">
              Renders at the bottom of CTA slides.
            </p>
          </div>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted mb-2">CHANNELS</p>
          <div className="flex gap-2">
            {ALL_CHANNELS.map((ch) => {
              const active = channels.includes(ch);
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => toggleChannel(ch)}
                  className={`btn-bracket px-3 py-1.5 border transition-colors ${
                    active
                      ? 'bg-primary border-primary text-white'
                      : 'border-border-color text-muted hover:border-text-primary hover:text-text-primary'
                  }`}
                >
                  {ch.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border-color pt-4">
          <button
            type="submit"
            disabled={!dirty || update.isPending || channels.length === 0}
            className="btn-bracket bg-primary text-white px-4 py-2 hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            {update.isPending ? 'SAVING' : 'SAVE_BRIEF'}
          </button>
          {saved && <span className="font-mono text-[10px] uppercase tracking-wider text-accent-emerald">SAVED</span>}
          {errorMessage && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-accent-red">[ERROR] {errorMessage}</span>
          )}
          {!dirty && !saved && !errorMessage && project.brief && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">UP_TO_DATE</span>
          )}
        </div>
      </form>
    </section>
  );
}

// ───────── Candidates section + wizard ─────────

function CandidatesSection({ project }: { project: Project }) {
  const runs = useRuns(project.id);
  const latestSetupRun = runs.data?.runs.find((r) => r.pipeline === 'setup');
  const isRunning = latestSetupRun?.status === 'running';

  const setup = useSetupOutputs(project.id, isRunning);
  const run = useRunSetup(project.id);
  const { nodeStatus, lastEvent } = useLivePipeline(project.id);

  const [wizardOpen, setWizardOpen] = useState(false);

  const briefReady = !!project.brief && project.brief.trim().length >= 30;
  const errorMessage = run.error instanceof ApiError ? run.error.message : null;
  const hasOutputs =
    !!setup.data && (setup.data.personas.length > 0 || setup.data.audiences.length > 0);
  const showProgress = isRunning || run.isPending;

  const completed = SETUP_NODES.filter((n) => nodeStatus[n] === 'done').length;
  const currentNode = SETUP_NODES.find((n) => nodeStatus[n] === 'running');

  const selectedAudience = setup.data?.audiences.find((a) => a.isSelected);
  const selectedVoice = setup.data?.voices.find((v) => v.isSelected);
  const activePersonas = setup.data?.personas.filter((p) => p.isActive) ?? [];
  const activeThemes = setup.data?.themes.filter((t) => t.isActive) ?? [];

  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Brand candidates</h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted mt-1">
            Generated by 7 setup agents · ~$0.003 · Pick &amp; curate via wizard
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {hasOutputs && (
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="btn-bracket bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40 px-3 py-1.5 hover:bg-accent-cyan/30 transition-colors"
            >
              CHOOSE_BRAND
            </button>
          )}
          <button
            type="button"
            onClick={() => run.mutate()}
            disabled={!briefReady || run.isPending || isRunning}
            className="btn-bracket bg-primary text-white px-3 py-1.5 hover:bg-primary/90 disabled:opacity-40 transition-colors"
            title={!briefReady ? 'Save a brief first' : undefined}
          >
            {showProgress ? 'GENERATING' : hasOutputs ? 'GENERATE_MORE' : 'GENERATE_CANDIDATES'}
          </button>
        </div>
      </header>

      {errorMessage && (
        <p className="font-mono text-[10px] uppercase tracking-wider text-accent-red">[ERROR] {errorMessage}</p>
      )}
      {!briefReady && (
        <p className="font-mono text-[10px] uppercase tracking-wider text-accent-amber">
          [WAITING] // Save a brief above (30+ chars) before generating
        </p>
      )}

      {showProgress && (
        <div className="rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 p-3">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider">
            <span className="text-accent-cyan">
              [{currentNode ? SETUP_LABELS[currentNode] : 'STARTING'}] // RUNNING
            </span>
            <span className="text-text-primary">
              {completed} / {SETUP_NODES.length}
            </span>
          </div>
          <div className="mt-2 h-1 w-full bg-accent-cyan/10 rounded overflow-hidden">
            <div
              className="h-full bg-accent-cyan transition-all"
              style={{ width: `${(completed / SETUP_NODES.length) * 100}%` }}
            />
          </div>
          {lastEvent && (
            <p className="mt-2 font-mono text-[10px] text-muted">
              latest: {lastEvent.agentName} · {lastEvent.eventType}
              {lastEvent.durationMs != null && ` · ${lastEvent.durationMs}ms`}
            </p>
          )}
        </div>
      )}

      {/* Current brand summary — distinguishes operator-curated state from
          schema defaults so the panel doesn't claim work the operator
          hasn't actually done. */}
      {setup.data && hasOutputs && !showProgress && (
        <BrandConfigPanel
          curated={!!selectedAudience || !!selectedVoice}
          selectedAudience={selectedAudience?.name}
          selectedVoice={selectedVoice?.name}
          activePersonas={activePersonas.map((p) => p.name)}
          totalPersonas={setup.data.personas.length}
          activeThemes={activeThemes.length}
          totalThemes={setup.data.themes.length}
          brandKit={setup.data.brandKit ? `${setup.data.brandKit.fonts.heading} / ${setup.data.brandKit.fonts.body}` : null}
          onOpenWizard={() => setWizardOpen(true)}
        />
      )}

      {setup.data && !hasOutputs && !showProgress && (
        <div className="rounded-lg border border-dashed border-border-color p-10 text-center">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">
            No candidates yet. Click [GENERATE_CANDIDATES] above.
          </p>
        </div>
      )}

      {wizardOpen && <ChooseWizard projectId={project.id} onClose={() => setWizardOpen(false)} />}
    </section>
  );
}

function BrandConfigPanel(props: {
  curated: boolean;
  selectedAudience: string | undefined;
  selectedVoice: string | undefined;
  activePersonas: string[];
  totalPersonas: number;
  activeThemes: number;
  totalThemes: number;
  brandKit: string | null;
  onOpenWizard: () => void;
}) {
  const {
    curated,
    selectedAudience,
    selectedVoice,
    activePersonas,
    totalPersonas,
    activeThemes,
    totalThemes,
    brandKit,
    onOpenWizard,
  } = props;

  const needsAudience = !selectedAudience;
  const needsVoice = !selectedVoice;
  // Personas/themes default to all-active. If the operator has never been
  // in the wizard (curated === false), don't claim they're "curated".
  const personasState: 'default' | 'curated' | 'empty' =
    activePersonas.length === 0
      ? 'empty'
      : !curated
        ? 'default'
        : 'curated';
  const themesState: 'default' | 'curated' | 'empty' =
    activeThemes === 0
      ? 'empty'
      : !curated
        ? 'default'
        : 'curated';

  const allDone = !needsAudience && !needsVoice && personasState !== 'empty' && themesState !== 'empty';

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${
        allDone ? 'border-border-color bg-surface-2/30' : 'border-accent-amber/40 bg-accent-amber/5'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <p className="font-mono text-[10px] uppercase tracking-wider">
          <span className={allDone ? 'text-accent-emerald' : 'text-accent-amber'}>
            [BRAND_CONFIG]
          </span>
          <span className="mx-2 text-muted opacity-50">//</span>
          <span className={allDone ? 'text-text-primary' : 'text-accent-amber'}>
            {allDone ? 'CURATED' : 'NEEDS_CURATION'}
          </span>
        </p>
        {!allDone && (
          <button
            type="button"
            onClick={onOpenWizard}
            className="btn-bracket bg-accent-amber text-background-dark px-3 py-1 hover:bg-accent-amber/90 transition-colors text-[11px]"
          >
            OPEN_WIZARD
          </button>
        )}
      </div>

      <ul className="space-y-1 text-sm">
        <ConfigLine
          label="AUDIENCE"
          state={needsAudience ? 'missing' : 'ok'}
          value={selectedAudience ?? 'Not picked yet'}
        />
        <ConfigLine
          label="VOICE"
          state={needsVoice ? 'missing' : 'ok'}
          value={selectedVoice ?? 'Not picked yet'}
        />
        <ConfigLine
          label="PERSONAS"
          state={personasState === 'empty' ? 'missing' : personasState === 'default' ? 'default' : 'ok'}
          value={
            personasState === 'empty'
              ? 'None active'
              : personasState === 'default'
                ? `${activePersonas.length}/${totalPersonas} active · default (not curated)`
                : `${activePersonas.length} active: ${activePersonas.join(', ')}`
          }
        />
        <ConfigLine
          label="THEMES"
          state={themesState === 'empty' ? 'missing' : themesState === 'default' ? 'default' : 'ok'}
          value={
            themesState === 'empty'
              ? 'None active'
              : themesState === 'default'
                ? `${activeThemes}/${totalThemes} active · default (not curated)`
                : `${activeThemes}/${totalThemes} active`
          }
        />
        <ConfigLine
          label="BRAND_KIT"
          state={brandKit ? 'ok' : 'missing'}
          value={brandKit ?? 'Not set'}
        />
      </ul>

      {!allDone && (
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
          The runtime is currently using <em>everything</em> in rotation. Pick one audience + voice and
          curate personas/themes to lock the brand in.
        </p>
      )}
    </div>
  );
}

function ConfigLine({
  label,
  state,
  value,
}: {
  label: string;
  state: 'ok' | 'missing' | 'default';
  value: string;
}) {
  const labelClass = state === 'missing' ? 'text-accent-amber' : state === 'default' ? 'text-accent-amber/70' : 'text-muted';
  const valueClass =
    state === 'ok' ? 'text-text-primary' : state === 'default' ? 'text-accent-amber italic' : 'text-accent-amber italic';
  return (
    <li className="grid grid-cols-[120px_1fr] gap-3 items-baseline">
      <span className={`font-mono text-[10px] uppercase tracking-wider ${labelClass}`}>
        {label}
        {state === 'missing' && ' ⚠'}
      </span>
      <span className={`text-sm ${valueClass}`}>{value}</span>
    </li>
  );
}
