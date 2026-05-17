import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { api, ApiError } from '../lib/api';
import type { Project } from '../lib/projects';
import { useDrafts } from '../lib/drafts';
import { useTriggerRun } from '../lib/pipeline';
import { useSetupOutputs } from '../lib/setup';

type Tab = 'overview' | 'pipeline' | 'drafts';

interface Props {
  projectId: string;
  activeTab: Tab;
  rightSlot?: React.ReactNode;
}

/**
 * Shared header for every page inside a project. Tabs across the top let the
 * operator flip between Overview / Pipeline / Drafts without bouncing back to
 * the projects list. A permanent "Generate now" button sits to the right and
 * is one click from anywhere in the project.
 *
 * Each page also calls useQuery(['projects', id]) — React Query dedupes so
 * we don't refetch when this component does too.
 */
export function ProjectHeader({ projectId, activeTab, rightSlot }: Props) {
  const projectQuery = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => api<{ project: Project }>(`/api/projects/${projectId}`).then((r) => r.project),
  });
  const drafts = useDrafts(projectId, 'pending');
  const setup = useSetupOutputs(projectId);
  const setupReady =
    !!setup.data && setup.data.personas.length > 0 && setup.data.themes.length > 0;
  const trigger = useTriggerRun(projectId);
  const triggerError = trigger.error instanceof ApiError ? trigger.error.message : null;
  const [location] = useLocation();
  void location;

  const project = projectQuery.data;
  const pendingCount = drafts.data?.length ?? 0;

  const tabs: { key: Tab; label: string; href: string; badge?: number }[] = [
    { key: 'overview', label: 'Overview', href: `/projects/${projectId}` },
    { key: 'pipeline', label: 'Pipeline', href: `/projects/${projectId}/pipeline` },
    {
      key: 'drafts',
      label: 'Drafts',
      href: `/projects/${projectId}/drafts`,
      badge: pendingCount,
    },
  ];

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm min-w-0">
            <Link href="/" className="text-neutral-500 hover:text-neutral-900 shrink-0">
              ← All projects
            </Link>
            <span className="text-neutral-300 shrink-0">/</span>
            <span className="font-semibold truncate">{project?.name ?? '…'}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {rightSlot}
            <button
              onClick={() => trigger.mutate()}
              disabled={trigger.isPending || !setupReady}
              className="rounded-md bg-neutral-900 text-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 whitespace-nowrap"
              title={
                !setupReady
                  ? 'Run setup first to unlock generation'
                  : 'Trigger the runtime pipeline (~$0.005). New draft will land in Drafts.'
              }
            >
              {trigger.isPending ? 'Generating…' : '⚡ Generate now'}
            </button>
          </div>
        </div>
        <nav className="flex gap-1 -mb-px text-sm">
          {tabs.map((t) => {
            const active = t.key === activeTab;
            return (
              <Link
                key={t.key}
                href={t.href}
                className={`px-4 py-2 border-b-2 transition-colors ${
                  active
                    ? 'border-neutral-900 font-medium text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {t.label}
                {t.badge ? (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      active ? 'bg-neutral-900 text-white' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {t.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
      {triggerError && (
        <div className="bg-red-50 border-t border-red-200 px-6 py-2 text-xs text-red-700 max-w-6xl mx-auto">
          Generate failed: {triggerError}
        </div>
      )}
    </header>
  );
}
