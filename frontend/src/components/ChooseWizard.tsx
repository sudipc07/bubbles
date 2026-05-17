import { useEffect, useState } from 'react';
import {
  useDeleteSetupItem,
  useSelectAudience,
  useSelectVoice,
  useSetupOutputs,
  useTogglePersona,
  useToggleTheme,
  useUpdateBrandKit,
  type Audience,
  type BrandKit,
  type Persona,
  type SetupOutputs,
  type Theme,
  type Voice,
} from '../lib/setup';

interface Props {
  projectId: string;
  onClose: () => void;
}

type StepKey = 'audience' | 'voice' | 'persona' | 'theme' | 'brandkit';
const STEPS: { key: StepKey; label: string }[] = [
  { key: 'audience', label: 'AUDIENCE' },
  { key: 'voice', label: 'VOICE' },
  { key: 'persona', label: 'PERSONAS' },
  { key: 'theme', label: 'THEMES' },
  { key: 'brandkit', label: 'BRAND_KIT' },
];

/**
 * Five-step modal that walks the operator through curating the setup outputs.
 * Each step writes back to the existing isSelected / isActive flags, so the
 * runtime Planner immediately picks up the curated brand on the next
 * Generate-post call.
 */
export function ChooseWizard({ projectId, onClose }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const setup = useSetupOutputs(projectId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!setup.data) {
    return (
      <Backdrop onClose={onClose}>
        <Shell stepIdx={0} onClose={onClose} onNext={() => {}} onBack={() => {}}>
          <p className="font-mono text-xs uppercase tracking-wider text-muted text-center py-20">
            [LOADING] // Fetching candidates…
          </p>
        </Shell>
      </Backdrop>
    );
  }

  const step = STEPS[stepIdx]!;
  const isLast = stepIdx === STEPS.length - 1;
  const onNext = isLast ? onClose : () => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  const onBack = stepIdx === 0 ? onClose : () => setStepIdx((i) => Math.max(0, i - 1));

  return (
    <Backdrop onClose={onClose}>
      <Shell stepIdx={stepIdx} onClose={onClose} onNext={onNext} onBack={onBack} isLast={isLast}>
        {step.key === 'audience' && <AudienceStep data={setup.data} projectId={projectId} />}
        {step.key === 'voice' && <VoiceStep data={setup.data} projectId={projectId} />}
        {step.key === 'persona' && <PersonaStep data={setup.data} projectId={projectId} />}
        {step.key === 'theme' && <ThemeStep data={setup.data} projectId={projectId} />}
        {step.key === 'brandkit' && <BrandKitStep data={setup.data} projectId={projectId} />}
      </Shell>
    </Backdrop>
  );
}

// ───────── Shell + chrome ─────────

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-background-dark/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl max-h-[90vh] flex">
        {children}
      </div>
    </div>
  );
}

function Shell({
  stepIdx,
  onClose,
  onNext,
  onBack,
  isLast,
  children,
}: {
  stepIdx: number;
  onClose: () => void;
  onNext: () => void;
  onBack: () => void;
  isLast?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col w-full bg-surface border border-border-color rounded-xl overflow-hidden">
      {/* Header — step indicator + close */}
      <header className="px-6 py-4 border-b border-border-color flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
          <span className="text-accent-cyan">[CHOOSE_BRAND]</span>
          <span className="mx-2 opacity-50">//</span>
          <span>STEP {String(stepIdx + 1).padStart(2, '0')}/{String(STEPS.length).padStart(2, '0')}</span>
          <span className="mx-2 opacity-50">//</span>
          <span className="text-text-primary">{STEPS[stepIdx]!.label}</span>
        </p>
        <button
          onClick={onClose}
          className="material-symbols-outlined text-muted hover:text-text-primary transition-colors"
          aria-label="Close wizard"
        >
          close
        </button>
      </header>

      {/* Progress dots */}
      <div className="px-6 py-3 border-b border-border-color flex gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < stepIdx
                ? 'bg-accent-emerald'
                : i === stepIdx
                  ? 'bg-primary'
                  : 'bg-border-color'
            }`}
          />
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scroll-thin p-6">{children}</div>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-border-color flex items-center justify-between bg-surface">
        <button
          onClick={onBack}
          className="btn-bracket border border-border-color text-muted px-3 py-1.5 hover:text-text-primary hover:border-text-primary transition-colors"
        >
          {stepIdx === 0 ? 'CANCEL' : 'BACK'}
        </button>
        <button
          onClick={onNext}
          className="btn-bracket bg-primary text-white px-3 py-1.5 hover:bg-primary/90 transition-colors"
        >
          {isLast ? 'CONFIRM_BRAND' : 'NEXT'}
        </button>
      </footer>
    </div>
  );
}

// ───────── Steps ─────────

function StepIntro({ title, helper }: { title: string; helper: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
      <p className="text-sm text-muted mt-1">{helper}</p>
    </div>
  );
}

function PickedBadge() {
  return (
    <span className="status-pill status-pill-emerald">SELECTED</span>
  );
}

function AudienceStep({ data, projectId }: { data: SetupOutputs; projectId: string }) {
  const select = useSelectAudience(projectId);
  const del = useDeleteSetupItem(projectId);

  return (
    <>
      <StepIntro
        title="Pick the audience"
        helper="One target audience for the runtime pipeline. Used by the Writer to angle content."
      />
      {data.audiences.length === 0 && (
        <EmptyHint>No audiences yet. Run [GENERATE_CANDIDATES] first.</EmptyHint>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        {data.audiences.map((a: Audience) => {
          const selected = a.isSelected;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => select.mutate(a.id)}
              className={`relative text-left rounded-lg border p-4 transition-colors ${
                selected
                  ? 'bg-primary/10 border-primary'
                  : 'bg-surface-2/40 border-border-color hover:border-text-primary'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-medium text-text-primary">{a.name}</p>
                {selected && <PickedBadge />}
              </div>
              <p className="text-sm text-muted">{a.summary}</p>
              {a.traits.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.traits.map((t) => (
                    <span key={t} className="rounded-full bg-surface-2 text-[10px] px-2 py-0.5 text-muted font-mono uppercase">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete "${a.name}"?`)) del.mutate({ kind: 'audiences', id: a.id });
                }}
                className="absolute top-2 right-2 text-muted hover:text-accent-red text-xs material-symbols-outlined"
                title="Delete candidate"
              >
                close
              </button>
            </button>
          );
        })}
      </div>
    </>
  );
}

function VoiceStep({ data, projectId }: { data: SetupOutputs; projectId: string }) {
  const select = useSelectVoice(projectId);
  const del = useDeleteSetupItem(projectId);

  return (
    <>
      <StepIntro
        title="Pick the voice"
        helper="One voice direction. The Writer follows its examples and avoidances on every draft."
      />
      {data.voices.length === 0 && (
        <EmptyHint>No voices yet. Run [GENERATE_CANDIDATES] first.</EmptyHint>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        {data.voices.map((v: Voice) => {
          const selected = v.isSelected;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => select.mutate(v.id)}
              className={`relative text-left rounded-lg border p-4 transition-colors ${
                selected
                  ? 'bg-primary/10 border-primary'
                  : 'bg-surface-2/40 border-border-color hover:border-text-primary'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-medium text-text-primary">{v.name}</p>
                {selected && <PickedBadge />}
              </div>
              <p className="text-sm text-muted">{v.description}</p>
              {v.examples.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs italic text-muted border-l-2 border-border-color pl-3">
                  {v.examples.map((ex, i) => (
                    <li key={i}>"{ex}"</li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete "${v.name}"?`)) del.mutate({ kind: 'voices', id: v.id });
                }}
                className="absolute top-2 right-2 text-muted hover:text-accent-red text-xs material-symbols-outlined"
                title="Delete candidate"
              >
                close
              </button>
            </button>
          );
        })}
      </div>
    </>
  );
}

function PersonaStep({ data, projectId }: { data: SetupOutputs; projectId: string }) {
  const toggle = useTogglePersona(projectId);
  const del = useDeleteSetupItem(projectId);

  return (
    <>
      <StepIntro
        title="Keep the personas you want"
        helper="Personas are authoring identities. Toggle active to include in the runtime rotation. Discard the ones that don't fit."
      />
      {data.personas.length === 0 && (
        <EmptyHint>No personas yet. Run [GENERATE_CANDIDATES] first.</EmptyHint>
      )}
      <div className="space-y-3">
        {data.personas.map((p: Persona) => {
          const active = p.isActive;
          return (
            <div
              key={p.id}
              className={`relative rounded-lg border p-4 transition-colors ${
                active ? 'bg-surface-2/60 border-border-color' : 'bg-surface-2/20 border-border-color/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="min-w-0">
                  <p className="font-medium text-text-primary">{p.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted mt-0.5">
                    CAROUSEL {p.formatMixCarouselPct}% · SINGLE {p.formatMixSinglePct}%
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 shrink-0 cursor-pointer">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    {active ? 'ACTIVE' : 'DISABLED'}
                  </span>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => toggle.mutate({ id: p.id, active: e.target.checked })}
                    className="h-4 w-4 accent-accent-cyan"
                  />
                </label>
              </div>
              <p className="text-sm text-muted">{p.description}</p>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Permanently delete "${p.name}"?`))
                    del.mutate({ kind: 'personas', id: p.id });
                }}
                className="absolute top-2 right-2 text-muted hover:text-accent-red material-symbols-outlined"
                title="Delete persona"
              >
                close
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ThemeStep({ data, projectId }: { data: SetupOutputs; projectId: string }) {
  const toggle = useToggleTheme(projectId);
  const del = useDeleteSetupItem(projectId);

  return (
    <>
      <StepIntro
        title="Choose your themes"
        helper="Themes are topic territories the Planner rotates through. Toggle to include / exclude."
      />
      {data.themes.length === 0 && (
        <EmptyHint>No themes yet. Run [GENERATE_CANDIDATES] first.</EmptyHint>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        {data.themes.map((t: Theme) => (
          <div
            key={t.id}
            className={`relative rounded-lg border p-4 transition-colors ${
              t.isActive ? 'bg-surface-2/60 border-border-color' : 'bg-surface-2/20 border-border-color/50 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-medium text-text-primary">{t.label}</p>
              <input
                type="checkbox"
                checked={t.isActive}
                onChange={(e) => toggle.mutate({ id: t.id, active: e.target.checked })}
                className="h-4 w-4 accent-accent-cyan cursor-pointer"
              />
            </div>
            <p className="text-sm text-muted">{t.description}</p>
            {t.exampleAngles.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-muted list-disc list-inside">
                {t.exampleAngles.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete "${t.label}"?`)) del.mutate({ kind: 'themes', id: t.id });
              }}
              className="absolute top-2 right-2 text-muted hover:text-accent-red material-symbols-outlined text-sm"
              title="Delete theme"
            >
              close
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function BrandKitStep({ data, projectId }: { data: SetupOutputs; projectId: string }) {
  const update = useUpdateBrandKit(projectId);
  const kit = data.brandKit;
  const [palette, setPalette] = useState(kit?.palette ?? defaultPalette);
  const [fonts, setFonts] = useState(kit?.fonts ?? { heading: 'Inter', body: 'Inter' });

  useEffect(() => {
    if (kit) {
      setPalette(kit.palette);
      setFonts(kit.fonts);
    }
  }, [kit?.id]);

  if (!kit) {
    return (
      <>
        <StepIntro
          title="Brand kit"
          helper="No brand kit yet. Run [GENERATE_CANDIDATES] from the Brand page."
        />
      </>
    );
  }

  const order: (keyof BrandKit['palette'])[] = ['primary', 'secondary', 'accent', 'background', 'text'];
  const dirty =
    order.some((k) => palette[k].toLowerCase() !== kit.palette[k].toLowerCase()) ||
    fonts.heading !== kit.fonts.heading ||
    fonts.body !== kit.fonts.body;

  return (
    <>
      <StepIntro
        title="Tune the brand kit"
        helper="Palette and fonts the Designer uses for every slide. Click a swatch to edit; save when ready."
      />
      <div className="grid grid-cols-5 gap-2 mb-4">
        {order.map((key) => (
          <div key={key} className="text-center">
            <label className="block cursor-pointer">
              <div
                className="h-20 w-full rounded-md border border-border-color"
                style={{ backgroundColor: palette[key] }}
              />
              <input
                type="color"
                value={palette[key]}
                onChange={(e) =>
                  setPalette({ ...palette, [key]: e.target.value.toLowerCase() })
                }
                className="sr-only"
              />
            </label>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">{key}</p>
            <input
              type="text"
              value={palette[key]}
              onChange={(e) => setPalette({ ...palette, [key]: e.target.value.toLowerCase() })}
              spellCheck={false}
              className="mt-0.5 w-full bg-transparent text-center text-xs font-mono text-text-primary focus:outline-none focus:bg-surface-2 rounded px-1"
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FontPicker label="HEADING" value={fonts.heading} onChange={(v) => setFonts({ ...fonts, heading: v })} />
        <FontPicker label="BODY" value={fonts.body} onChange={(v) => setFonts({ ...fonts, body: v })} />
      </div>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={!dirty || update.isPending}
          onClick={() => update.mutate({ palette, fonts })}
          className="btn-bracket bg-primary text-white px-3 py-1.5 hover:bg-primary/90 disabled:opacity-40"
        >
          {update.isPending ? 'SAVING' : 'SAVE_KIT'}
        </button>
      </div>
    </>
  );
}

const SAFE_FONTS = [
  'Inter',
  'Source Sans 3',
  'Manrope',
  'Plus Jakarta Sans',
  'IBM Plex Sans',
  'Lora',
  'Source Serif 4',
  'Playfair Display',
  'Merriweather',
  'Space Grotesk',
  'JetBrains Mono',
] as const;

function FontPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const isCustom = !SAFE_FONTS.includes(value as (typeof SAFE_FONTS)[number]);
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1">{label}</p>
      <select
        value={isCustom ? '__custom' : value}
        onChange={(e) => onChange(e.target.value === '__custom' ? value : e.target.value)}
        className="bg-surface-2 border border-border-color rounded px-3 py-2 text-sm w-full text-text-primary focus:outline-none focus:border-accent-cyan"
        style={{ fontFamily: value }}
      >
        {SAFE_FONTS.map((f) => (
          <option key={f} value={f} style={{ fontFamily: f }}>
            {f}
          </option>
        ))}
        {isCustom && <option value="__custom">{value} (custom)</option>}
      </select>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border-color p-10 text-center">
      <p className="font-mono text-xs uppercase tracking-wider text-muted">{children}</p>
    </div>
  );
}

const defaultPalette = {
  primary: '#111827',
  secondary: '#6b7280',
  accent: '#2563eb',
  background: '#ffffff',
  text: '#111827',
};
