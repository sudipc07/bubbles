import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useRoute } from 'wouter';
import { api } from '../lib/api';
import { useDecideDraft, useDraft, useMarkPosted } from '../lib/drafts';
import type { Project } from '../lib/projects';
import { useSetupOutputs } from '../lib/setup';
import { SlidePreview } from '../components/SlidePreview';
import { ProjectHeader } from '../components/ProjectHeader';
import {
  downloadAllSlidesAsPdf,
  downloadAllSlidesAsZip,
  downloadSlidePng,
  type SlideExport,
} from '../lib/exportSlides';

export function DraftDetailPage() {
  const [, params] = useRoute('/projects/:id/drafts/:draftId');
  const projectId = params?.id;
  const draftId = params?.draftId;
  const query = useDraft(projectId, draftId);
  const setupOutputs = useSetupOutputs(projectId);
  const projectQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['projects', projectId],
    queryFn: () => api<{ project: Project }>(`/api/projects/${projectId}`).then((r) => r.project),
  });
  const decide = useDecideDraft(projectId, draftId);
  const post = useMarkPosted(projectId, draftId);
  const [postUrl, setPostUrl] = useState('');
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<'png' | 'zip' | 'pdf' | null>(null);

  function collectSlides(): SlideExport[] {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-slide-canvas]'));
    return nodes
      .map((el) => ({
        el,
        index: Number(el.dataset.slideIndex ?? '0'),
      }))
      .sort((a, b) => a.index - b.index);
  }

  function baseFilename(): string {
    if (!query.data) return 'slides';
    const t = query.data.draft.topicTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    return t || 'slides';
  }

  async function onDownloadSinglePng() {
    if (downloading) return;
    setDownloading('png');
    try {
      const slides = collectSlides();
      if (slides.length === 1) {
        await downloadSlidePng(slides[0]!, baseFilename());
      } else {
        await downloadAllSlidesAsZip(slides, baseFilename());
      }
    } catch (err) {
      console.error('download failed', err);
      window.alert('Download failed — check console for details.');
    } finally {
      setDownloading(null);
    }
  }

  async function onDownloadPdf() {
    if (downloading) return;
    setDownloading('pdf');
    try {
      const slides = collectSlides();
      await downloadAllSlidesAsPdf(slides, baseFilename());
    } catch (err) {
      console.error('PDF export failed', err);
      window.alert('PDF export failed — check console for details.');
    } finally {
      setDownloading(null);
    }
  }

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
      <ProjectHeader
        projectId={projectId}
        page="INSPECTOR"
        rightSlot={
          <Link
            href={`/projects/${projectId}/drafts`}
            className="rounded-md border border-border-color px-3 py-1.5 text-xs font-medium hover:bg-surface-2"
          >
            ← All drafts
          </Link>
        }
      />
      {copyToast && (
        <div className="max-w-4xl mx-auto px-6 pt-2 text-xs text-accent-emerald">{copyToast} copied</div>
      )}

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {query.isLoading && <p className="text-sm text-muted">Loading…</p>}
        {query.error && <p className="text-sm text-accent-red">Could not load draft.</p>}
        {query.data && (
          <>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{query.data.draft.topicTitle}</h1>
              <p className="text-xs text-muted mt-1">
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
                        ? 'border-accent-emerald/40 text-accent-emerald'
                        : 'border-accent-red/40 text-accent-red'
                    }`}
                  >
                    safety: {query.data.draft.safetyVerdict}
                  </span>
                )}
                <span className="rounded-full border px-2 py-0.5 capitalize">{query.data.draft.status}</span>
              </div>
              {query.data.draft.safetyReasons.length > 0 && (
                <ul className="mt-2 text-xs text-accent-red list-disc list-inside">
                  {query.data.draft.safetyReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>

            <section>
              <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  Slide previews
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onDownloadSinglePng}
                    disabled={!!downloading}
                    className="rounded-md border border-border-color px-3 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-50"
                  >
                    {downloading === 'png' ? 'Exporting…' : query.data.slides.length > 1 ? 'Download PNGs (ZIP)' : 'Download PNG'}
                  </button>
                  {query.data.slides.length > 1 && (
                    <button
                      onClick={onDownloadPdf}
                      disabled={!!downloading}
                      className="rounded-md bg-primary text-white px-3 py-1.5 text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      {downloading === 'pdf' ? 'Exporting…' : 'Download PDF'}
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted mb-3">
                Rendered at native 1080px and downloaded as real image files — ready to upload to
                LinkedIn or Instagram as-is.
              </p>
              <div
                className={`grid gap-4 ${
                  query.data.draft.format === 'single_image'
                    ? 'max-w-[520px] mx-auto'
                    : 'sm:grid-cols-2'
                }`}
              >
                {query.data.slides.map((s) => (
                  <div key={s.id}>
                    <SlidePreview
                      slide={s}
                      totalSlides={query.data!.slides.length}
                      kit={setupOutputs.data?.brandKit ?? null}
                      format={query.data!.draft.format}
                      projectName={projectQuery.data?.name ?? ''}
                      publicUrl={projectQuery.data?.publicUrl ?? null}
                    />
                    <p className="mt-1.5 text-[10px] uppercase tracking-wide text-muted">
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

            <section className="border-t border-border-color pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">Actions</h2>
              {query.data.draft.status === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => decide.mutate('approved')}
                    disabled={decide.isPending}
                    className="rounded-md bg-accent-emerald text-white px-3 py-1.5 text-sm font-medium hover:bg-accent-emerald/90 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => decide.mutate('rejected')}
                    disabled={decide.isPending}
                    className="rounded-md bg-accent-red text-white px-3 py-1.5 text-sm font-medium hover:bg-accent-red/90 disabled:opacity-50"
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
                    className="flex-1 rounded-md border border-border-color px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-cyan"
                  />
                  <button
                    onClick={() => post.mutate(postUrl)}
                    disabled={!postUrl || post.isPending}
                    className="rounded-md bg-primary text-white px-3 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    Mark posted
                  </button>
                </div>
              ) : query.data.draft.status === 'posted' ? (
                <p className="text-sm text-accent-emerald">
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
                <p className="text-sm text-muted">Rejected.</p>
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{label}</h2>
        <button onClick={onCopy} className="text-xs text-muted hover:text-text-primary underline">
          copy
        </button>
      </div>
      <pre className="rounded-lg border border-border-color bg-surface-2 p-4 text-sm whitespace-pre-wrap font-sans">
        {text}
      </pre>
    </section>
  );
}
