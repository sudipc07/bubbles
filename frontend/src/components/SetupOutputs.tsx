import { useDeleteSetupItem, type SetupKind, type SetupOutputs } from '../lib/setup';

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
      {data.brandKit && <BrandKitCard kit={data.brandKit} />}
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
      className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
    >
      ×
    </button>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <span className="text-xs text-neutral-500">{count}</span>
    </div>
  );
}

function BrandKitCard({ kit }: { kit: NonNullable<SetupOutputs['brandKit']> }) {
  const entries = Object.entries(kit.palette) as [string, string][];
  return (
    <section>
      <SectionTitle title="Brand kit" count={5} />
      <div className="rounded-lg border border-neutral-200 p-4">
        <div className="grid grid-cols-5 gap-2 mb-4">
          {entries.map(([label, color]) => (
            <div key={label} className="text-center">
              <div
                className="h-16 w-full rounded-md border border-neutral-200"
                style={{ backgroundColor: color }}
              />
              <p className="mt-1.5 text-[10px] uppercase tracking-wide text-neutral-500">{label}</p>
              <p className="text-xs font-mono">{color}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Heading</p>
            <p style={{ fontFamily: kit.fonts.heading }} className="text-lg">
              {kit.fonts.heading}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Body</p>
            <p style={{ fontFamily: kit.fonts.body }}>{kit.fonts.body}</p>
          </div>
        </div>
      </div>
    </section>
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
          <div key={a.id} className="relative rounded-lg border border-neutral-200 p-4 pr-10">
            <DeleteButton projectId={projectId} kind="audiences" id={a.id} label={a.name} />
            <p className="font-medium">{a.name}</p>
            <p className="mt-1 text-sm text-neutral-600">{a.summary}</p>
            {a.traits.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {a.traits.map((t) => (
                  <span key={t} className="rounded-full bg-neutral-100 text-xs px-2 py-0.5 text-neutral-700">
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
          <div key={v.id} className="relative rounded-lg border border-neutral-200 p-4 pr-10">
            <DeleteButton projectId={projectId} kind="voices" id={v.id} label={v.name} />
            <p className="font-medium">{v.name}</p>
            <p className="mt-1 text-sm text-neutral-600">{v.description}</p>
            {v.examples.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs italic text-neutral-700 border-l-2 border-neutral-200 pl-3">
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
            <div key={p.id} className="relative rounded-lg border border-neutral-200 p-4 pr-10">
              <DeleteButton projectId={projectId} kind="personas" id={p.id} label={p.name} />
              <div className="flex items-baseline justify-between mb-1">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-neutral-500 font-mono">
                  carousel {p.formatMixCarouselPct}% · single {p.formatMixSinglePct}%
                </p>
              </div>
              <p className="text-sm text-neutral-600">{p.description}</p>
              {personaSamples.length > 0 && (
                <div className="mt-3 grid md:grid-cols-2 gap-2">
                  {personaSamples.map((s) => (
                    <div key={s.id} className="rounded-md bg-neutral-50 border border-neutral-200 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                        {s.format.replace('_', ' ')}
                      </p>
                      <p className="text-sm font-medium mt-0.5">{s.title}</p>
                      <p className="mt-1 text-xs text-neutral-700 whitespace-pre-wrap leading-relaxed">
                        {s.body}
                      </p>
                    </div>
                  ))}
                </div>
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
          <div key={t.id} className="relative rounded-lg border border-neutral-200 p-4 pr-10">
            <DeleteButton projectId={projectId} kind="themes" id={t.id} label={t.label} />
            <p className="font-medium">{t.label}</p>
            <p className="mt-1 text-sm text-neutral-600">{t.description}</p>
            {t.exampleAngles.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-neutral-500 list-disc list-inside">
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
