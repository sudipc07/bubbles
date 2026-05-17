import { useEffect, useState } from 'react';
import {
  useDeleteSetupItem,
  useUpdateBrandKit,
  type SetupKind,
  type SetupOutputs,
} from '../lib/setup';

interface ViewProps {
  data: SetupOutputs;
  projectId: string;
}

export function SetupOutputsView({ data, projectId }: ViewProps) {
  const hasAny =
    data.audiences.length > 0 ||
    data.voices.length > 0 ||
    data.personas.length > 0 ||
    data.themes.length > 0 ||
    data.samples.length > 0 ||
    !!data.brandKit;

  if (!hasAny) return null;

  return (
    <div className="space-y-8">
      <div className="rounded-md bg-accent-amber/10 border border-accent-amber/40 p-3 text-xs leading-relaxed text-accent-amber">
        <p className="font-semibold mb-1">What this section is — and isn't</p>
        <p>
          Setup produces the <em>configuration</em> for this brand: audiences, voices, personas,
          themes, and a brand kit. Plus 10 sample posts (2 per persona) so you can see what each
          persona will write like. <strong>Sample posts are never published</strong> and don't
          appear in the Drafts queue — they're previews to help you decide whether to keep each
          persona. Real drafts come from the <em>runtime</em> pipeline (Pipeline tab → Generate
          now), which lands in <em>Drafts</em>.
        </p>
      </div>
      {data.brandKit && <BrandKitCard kit={data.brandKit} projectId={projectId} />}
      {data.audiences.length > 0 && <AudiencesSection audiences={data.audiences} projectId={projectId} />}
      {data.voices.length > 0 && <VoicesSection voices={data.voices} projectId={projectId} />}
      {data.personas.length > 0 && (
        <PersonasSection personas={data.personas} samples={data.samples} projectId={projectId} />
      )}
      {data.themes.length > 0 && <ThemesSection themes={data.themes} projectId={projectId} />}
    </div>
  );
}

function DeleteButton({
  projectId,
  kind,
  id,
  label,
}: {
  projectId: string;
  kind: SetupKind;
  id: string;
  label: string;
}) {
  const del = useDeleteSetupItem(projectId);
  return (
    <button
      type="button"
      onClick={() => {
        if (window.confirm(`Delete "${label}"? This cannot be undone.`)) {
          del.mutate({ kind, id });
        }
      }}
      disabled={del.isPending}
      title={`Delete ${label}`}
      className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-md text-muted hover:bg-accent-red/10 hover:text-accent-red disabled:opacity-40"
    >
      ×
    </button>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <span className="text-xs text-muted">{count}</span>
    </div>
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

type PaletteKey = 'primary' | 'secondary' | 'accent' | 'background' | 'text';
const PALETTE_ORDER: PaletteKey[] = ['primary', 'secondary', 'accent', 'background', 'text'];

function BrandKitCard({
  kit,
  projectId,
}: {
  kit: NonNullable<SetupOutputs['brandKit']>;
  projectId: string;
}) {
  const update = useUpdateBrandKit(projectId);
  const [palette, setPalette] = useState(kit.palette);
  const [fonts, setFonts] = useState(kit.fonts);
  const [saved, setSaved] = useState(false);

  // Keep local state in sync if the upstream kit changes (e.g. setup re-run).
  useEffect(() => {
    setPalette(kit.palette);
    setFonts(kit.fonts);
  }, [kit.palette, kit.fonts]);

  const dirty =
    PALETTE_ORDER.some((k) => palette[k].toLowerCase() !== kit.palette[k].toLowerCase()) ||
    fonts.heading !== kit.fonts.heading ||
    fonts.body !== kit.fonts.body;

  async function onSave() {
    setSaved(false);
    await update.mutateAsync({ palette, fonts });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section>
      <SectionTitle title="Brand kit" count={5} />
      <div className="rounded-lg border border-border-color p-4">
        <div className="grid grid-cols-5 gap-2 mb-4">
          {PALETTE_ORDER.map((key) => (
            <div key={key} className="text-center">
              <label className="block cursor-pointer" title="Click to change">
                <div
                  className="h-16 w-full rounded-md border border-border-color transition-transform hover:scale-[1.02]"
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
              <p className="mt-1.5 text-[10px] uppercase tracking-wide text-muted">{key}</p>
              <input
                type="text"
                value={palette[key]}
                onChange={(e) => {
                  const v = e.target.value.toLowerCase();
                  setPalette({ ...palette, [key]: v });
                }}
                spellCheck={false}
                className="mt-0.5 w-full bg-transparent text-center text-xs font-mono focus:outline-none focus:bg-surface-2 rounded px-1"
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <FontPicker
            label="Heading"
            value={fonts.heading}
            onChange={(v) => setFonts({ ...fonts, heading: v })}
          />
          <FontPicker
            label="Body"
            value={fonts.body}
            onChange={(v) => setFonts({ ...fonts, body: v })}
          />
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-border-color pt-3">
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || update.isPending}
            className="rounded-md bg-primary text-white px-3 py-1.5 text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {update.isPending ? 'Saving…' : 'Save brand kit'}
          </button>
          {saved && <span className="text-xs text-accent-emerald">Saved.</span>}
          {!dirty && !saved && <span className="text-xs text-muted">Click a swatch to edit.</span>}
        </div>
      </div>
    </section>
  );
}

function FontPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const isCustom = !SAFE_FONTS.includes(value as (typeof SAFE_FONTS)[number]);
  return (
    <div>
      <p className="text-xs text-muted uppercase tracking-wide mb-1">{label}</p>
      <select
        value={isCustom ? '__custom' : value}
        onChange={(e) => onChange(e.target.value === '__custom' ? value : e.target.value)}
        className="text-lg bg-transparent border-b border-transparent hover:border-border-color focus:border-accent-cyan focus:outline-none cursor-pointer"
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

function AudiencesSection({
  audiences,
  projectId,
}: {
  audiences: SetupOutputs['audiences'];
  projectId: string;
}) {
  return (
    <section>
      <SectionTitle title="Audiences" count={audiences.length} />
      <div className="grid md:grid-cols-2 gap-3">
        {audiences.map((a) => (
          <div key={a.id} className="relative rounded-lg border border-border-color p-4 pr-10">
            <DeleteButton projectId={projectId} kind="audiences" id={a.id} label={a.name} />
            <p className="font-medium">{a.name}</p>
            <p className="mt-1 text-sm text-muted">{a.summary}</p>
            {a.traits.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {a.traits.map((t) => (
                  <span key={t} className="rounded-full bg-surface-2 text-xs px-2 py-0.5 text-text-primary">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function VoicesSection({
  voices,
  projectId,
}: {
  voices: SetupOutputs['voices'];
  projectId: string;
}) {
  return (
    <section>
      <SectionTitle title="Voice directions" count={voices.length} />
      <div className="grid md:grid-cols-2 gap-3">
        {voices.map((v) => (
          <div key={v.id} className="relative rounded-lg border border-border-color p-4 pr-10">
            <DeleteButton projectId={projectId} kind="voices" id={v.id} label={v.name} />
            <p className="font-medium">{v.name}</p>
            <p className="mt-1 text-sm text-muted">{v.description}</p>
            {v.examples.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs italic text-text-primary border-l-2 border-border-color pl-3">
                {v.examples.map((ex, i) => (
                  <li key={i}>"{ex}"</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function PersonasSection({
  personas,
  samples,
  projectId,
}: {
  personas: SetupOutputs['personas'];
  samples: SetupOutputs['samples'];
  projectId: string;
}) {
  return (
    <section>
      <SectionTitle title="Personas" count={personas.length} />
      <div className="space-y-3">
        {personas.map((p) => {
          const personaSamples = samples.filter((s) => s.personaId === p.id);
          return (
            <div key={p.id} className="relative rounded-lg border border-border-color p-4 pr-10">
              <DeleteButton projectId={projectId} kind="personas" id={p.id} label={p.name} />
              <div className="flex items-baseline justify-between mb-1">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted font-mono">
                  carousel {p.formatMixCarouselPct}% · single {p.formatMixSinglePct}%
                </p>
              </div>
              <p className="text-sm text-muted">{p.description}</p>
              {personaSamples.length > 0 && (
                <>
                  <p className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-accent-amber">
                    Sample posts · preview only · never published
                  </p>
                  <div className="mt-1 grid md:grid-cols-2 gap-2">
                    {personaSamples.map((s) => (
                      <div key={s.id} className="rounded-md bg-accent-amber/10/40 border border-amber-100 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                          {s.format.replace('_', ' ')}
                        </p>
                        <p className="text-sm font-medium mt-0.5">{s.title}</p>
                        <p className="mt-1 text-xs text-text-primary whitespace-pre-wrap leading-relaxed">
                          {s.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ThemesSection({
  themes,
  projectId,
}: {
  themes: SetupOutputs['themes'];
  projectId: string;
}) {
  return (
    <section>
      <SectionTitle title="Themes" count={themes.length} />
      <div className="grid md:grid-cols-2 gap-3">
        {themes.map((t) => (
          <div key={t.id} className="relative rounded-lg border border-border-color p-4 pr-10">
            <DeleteButton projectId={projectId} kind="themes" id={t.id} label={t.label} />
            <p className="font-medium">{t.label}</p>
            <p className="mt-1 text-sm text-muted">{t.description}</p>
            {t.exampleAngles.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-muted list-disc list-inside">
                {t.exampleAngles.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
