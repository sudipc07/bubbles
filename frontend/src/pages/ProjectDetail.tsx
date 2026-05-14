import { useQuery } from '@tanstack/react-query';
import { Link, useRoute } from 'wouter';
import { api } from '../lib/api';
import type { Project } from '../lib/projects';

export function ProjectDetailPage() {
  const [, params] = useRoute('/projects/:id');
  const id = params?.id;
  const query = useQuery({
    enabled: !!id,
    queryKey: ['projects', id],
    queryFn: () => api<{ project: Project }>(`/api/projects/${id}`).then((r) => r.project),
  });

  if (!id) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between text-sm">
          <Link href="/" className="text-neutral-500 hover:text-neutral-900">
            ← All projects
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {query.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
        {query.error && (
          <p className="text-sm text-red-600">Could not load project.</p>
        )}
        {query.data && (
          <>
            <div className="flex items-baseline justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{query.data.name}</h1>
                <p className="text-sm text-neutral-500 font-mono mt-1">{query.data.slug}</p>
              </div>
              <Link
                href={`/projects/${query.data.id}/pipeline`}
                className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                View pipeline →
              </Link>
            </div>

            <section className="mt-8 rounded-lg border border-neutral-200 p-6">
              <p className="text-sm text-neutral-600">
                Status: <span className="font-mono">{query.data.status}</span> · Monthly cost
                ceiling: <span className="font-mono">${query.data.monthlyCostCeilingUsd}</span>
              </p>
              <p className="text-xs text-neutral-500 mt-3">
                Setup wizard ships in Phase 4. The pipeline graph above is already wired up and
                will populate live as agents run.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
