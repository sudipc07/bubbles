import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { useDrafts, type DraftFilter } from '../lib/drafts';
import { ProjectHeader } from '../components/ProjectHeader';

export function DraftsPage() {
  const [, params] = useRoute('/projects/:id/drafts');
  const projectId = params?.id;
  const [filter, setFilter] = useState<DraftFilter>('all');
  const drafts = useDrafts(projectId, filter);

  if (!projectId) return null;

  const filterToggle = (
    <div className="inline-flex rounded-md border border-border-color overflow-hidden text-xs">
      {(['all', 'pending', 'decided'] as const).map((f) => (
        <button
          key={f}
          onClick={() => setFilter(f)}
          className={`px-3 py-1.5 font-medium capitalize ${
            filter === f ? 'bg-primary text-white' : 'bg-surface text-muted hover:bg-surface-2'
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen">
      <ProjectHeader projectId={projectId} page="POSTS" rightSlot={filterToggle} />

      <main className="max-w-6xl mx-auto px-6 py-6">
        {drafts.isLoading && <p className="text-sm text-muted">Loading…</p>}
        {drafts.data && drafts.data.length === 0 && (
          <div className="rounded-lg border border-dashed border-border-color p-10 text-center space-y-3">
            <p className="text-sm text-text-primary font-medium">No drafts in this queue yet</p>
            <p className="text-xs text-muted max-w-md mx-auto">
              Drafts are produced by the <em>runtime</em> pipeline (Pipeline tab → Generate now).
              Setup samples are previews and don't appear here.
            </p>
            <Link
              href={`/projects/${projectId}/pipeline`}
              className="inline-block rounded-md bg-primary text-white px-3 py-1.5 text-xs font-medium hover:bg-primary/90"
            >
              Open Pipeline →
            </Link>
          </div>
        )}
        {drafts.data && drafts.data.length > 0 && (
          <ul className="space-y-2">
            {drafts.data.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/projects/${projectId}/drafts/${d.id}`}
                  className="block rounded-lg border border-border-color p-4 hover:bg-surface-2 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{d.topicTitle}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {d.format.replace('_', ' ')}
                        {d.angle && <span> · {d.angle}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {d.empathyVerdict && <Pill label={d.empathyVerdict} variant={empathyVariant(d.empathyVerdict)} />}
                      {d.safetyVerdict && (
                        <Pill
                          label={`safety: ${d.safetyVerdict}`}
                          variant={d.safetyVerdict === 'pass' ? 'good' : 'bad'}
                        />
                      )}
                      <StatusPill status={d.status} />
                    </div>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {new Date(d.createdAt).toLocaleString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

type Variant = 'good' | 'meh' | 'bad' | 'neutral';
function variantClasses(v: Variant): string {
  switch (v) {
    case 'good':
      return 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/40';
    case 'meh':
      return 'bg-accent-amber/10 text-accent-amber border-accent-amber/40';
    case 'bad':
      return 'bg-accent-red/10 text-accent-red border-accent-red/40';
    default:
      return 'bg-surface-2 text-text-primary border-border-color';
  }
}

function Pill({ label, variant }: { label: string; variant: Variant }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${variantClasses(variant)}`}>
      {label}
    </span>
  );
}

function empathyVariant(v: 'helpful' | 'performative' | 'tone_deaf'): Variant {
  return v === 'helpful' ? 'good' : v === 'performative' ? 'meh' : 'bad';
}

function StatusPill({ status }: { status: 'pending' | 'approved' | 'rejected' | 'posted' }) {
  const v: Variant =
    status === 'approved' ? 'good' : status === 'rejected' ? 'bad' : status === 'posted' ? 'good' : 'neutral';
  return <Pill label={status} variant={v} />;
}
