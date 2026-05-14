import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { useDecideDraft, useDraft, useMarkPosted } from '../lib/drafts';
import { useSetupOutputs } from '../lib/setup';
import { SlidePreview } from '../components/SlidePreview';

export function DraftDetailPage() {
  const [, params] = useRoute('/projects/:id/drafts/:draftId');
  const projectId = params?.id;
  const draftId = params?.draftId;
  const query = useDraft(projectId, draftId);
  const setupOutputs = useSetupOutputs(projectId);
  const decide = useDecideDraft(projectId, draftId);
  const post = useMarkPosted(projectId, draftId);
  const [postUrl, setPostUrl] = useState('');
  const [copyToast, setCopyToast] = useState<string | null>(null);

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyToast(label);
      setTimeout(() => setCopyToast(null), 1500);
    } catch {}
  }

  if (!projectId || !draftId) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between text-sm">
          <Link href={`/projects/${projectId}/drafts`} className="text-neutral-500 hover:text-neutral-900">
            ← Drafts
          </Link>
          {copyToast && <span className="text-emerald-700">{copyToast} copied</span>}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {query.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
        {query.error && <p className="text-sm text-red-600">Could not load draft.</p>}
        {query.data && (
          <>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{query.data.draft.topicTitle}</h1>
              <p className="text-xs text-neutral-500 mt-1">
                {query.data.draft.format.replace('_', ' ')}
                {query.data.draft.angle && ` · ${query.data.draft.angle}`} ·{' '}
                {new Date(query.data.draft.createdAt).toLocaleString()}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                {query.data.draft.empathyVerdict && (
                  <span className="rounded-full border px-2 py-0.5 capitalize">
                    empathy: {query.data.draft.empathyVerdict.replace('_', ' ')}
                  </span>
                )}
                {query.data.draft.safetyVerdict && (
                  <span
                    className={`rounded-full border px-2 py-0.5 ${
                      query.data.draft.safetyVerdict === 'pass'
                        ? 'border-emerald-200 text-emerald-700'
                        : 'border-red-200 text-red-700'
                    }`}
                  >
                    safety: {query.data.draft.safetyVerdict}
                  </span>
                )}
                <span className="rounded-full border px-2 py-0.5 capitalize">{query.data.draft.status}</span>
              </div>
              {query.data.draft.safetyReasons.length > 0 && (
                <ul className="mt-2 text-xs text-red-700 list-disc list-inside">
                  {query.data.draft.safetyReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>

            <section>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                  Slide previews
                </h2>
                <p className="text-xs text-neutral-400">
                  Brand-kit themed. Pre-Designer/Playwright; final images render server-side once
                  Phase 5 lands.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {query.data.slides.map((s) => (
                  <div key={s.id}>
                    <SlidePreview
                      slide={s}
                      totalSlides={query.data!.slides.length}
                      kit={setupOutputs.data?.brandKit ?? null}
                      format={query.data!.draft.format}
                    />
                    <p className="mt-1.5 text-[10px] uppercase tracking-wide text-neutral-400">
                      Slide {s.slideIndex + 1} · {s.kind}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {query.data.draft.linkedinCaption && (
              <CaptionBlock
                label="LinkedIn caption"
                text={query.data.draft.linkedinCaption}
                onCopy={() => copyText(query.data!.draft.linkedinCaption!, 'LinkedIn')}
              />
            )}
            {query.data.draft.instagramCaption && (
              <CaptionBlock
                label="Instagram caption"
                text={query.data.draft.instagramCaption}
                onCopy={() => copyText(query.data!.draft.instagramCaption!, 'Instagram')}
              />
            )}

            <section className="border-t border-neutral-200 pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-3">Actions</h2>
              {query.data.draft.status === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => decide.mutate('approved')}
                    disabled={decide.isPending}
                    className="rounded-md bg-emerald-700 text-white px-3 py-1.5 text-sm font-medium hover:bg-emerald-800 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => decide.mutate('rejected')}
                    disabled={decide.isPending}
                    className="rounded-md bg-red-700 text-white px-3 py-1.5 text-sm font-medium hover:bg-red-800 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              ) : query.data.draft.status === 'approved' ? (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    placeholder="Posted URL (LinkedIn/Instagram link)"
                    className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <button
                    onClick={() => post.mutate(postUrl)}
                    disabled={!postUrl || post.isPending}
                    className="rounded-md bg-neutral-900 text-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Mark posted
                  </button>
                </div>
              ) : query.data.draft.status === 'posted' ? (
                <p className="text-sm text-emerald-700">
                  Posted at{' '}
                  <a
                    href={query.data.draft.postedUrl ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {query.data.draft.postedUrl}
                  </a>
                </p>
              ) : (
                <p className="text-sm text-neutral-500">Rejected.</p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function CaptionBlock({ label, text, onCopy }: { label: string; text: string; onCopy: () => void }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{label}</h2>
        <button onClick={onCopy} className="text-xs text-neutral-600 hover:text-neutral-900 underline">
          copy
        </button>
      </div>
      <pre className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm whitespace-pre-wrap font-sans">
        {text}
      </pre>
    </section>
  );
}
