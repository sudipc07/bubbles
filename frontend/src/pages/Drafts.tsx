import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { useDrafts, type DraftFilter } from '../lib/drafts';

export function DraftsPage() {
  const [, params] = useRoute('/projects/:id/drafts');
  const projectId = params?.id;
  const [filter, setFilter] = useState<DraftFilter>('all');
  const drafts = useDrafts(projectId, filter);

  if (!projectId) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <Link href={`/projects/${projectId}`} className="text-neutral-500 hover:text-neutral-900">
              ← Project
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="font-medium">Drafts</span>
          </div>
          <div className="inline-flex rounded-md border border-neutral-200 overflow-hidden text-xs">
            {(['all', 'pending', 'decided'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 font-medium capitalize ${
                  filter === f ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {drafts.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
        {drafts.data && drafts.data.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center">
            <p className="text-sm text-neutral-500">
              No drafts yet. Trigger a runtime pipeline from the Pipeline tab.
            </p>
          </div>
        )}
        {drafts.data && drafts.data.length > 0 && (
          <ul className="space-y-2">
            {drafts.data.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/projects/${projectId}/drafts/${d.id}`}
                  className="block rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{d.topicTitle}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
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
                  <p className="text-xs text-neutral-400 mt-1">
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
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'meh':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'bad':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-neutral-100 text-neutral-700 border-neutral-200';
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
