import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Project } from '../lib/projects';

interface Props {
  projectId: string;
  page: 'DASHBOARD' | 'BRAND' | 'GENERATE' | 'REVIEW' | 'PIPELINE' | 'SETTINGS' | 'INSPECTOR' | 'POSTS';
  rightSlot?: React.ReactNode;
}

/**
 * Content-area header for every page inside a project. Carries the
 * `[BUBBLES] // PROJECT_NAME // PAGE` breadcrumb and an optional right slot
 * for page-specific controls (graph type toggle, filter, "All drafts" link).
 *
 * No persistent action button — workflow CTAs live on the page they belong
 * to (e.g. "Generate post" sits inside the GENERATE page, not orbiting
 * everything).
 */
export function ProjectHeader({ projectId, page, rightSlot }: Props) {
  const projectQuery = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => api<{ project: Project }>(`/api/projects/${projectId}`).then((r) => r.project),
  });

  const project = projectQuery.data;
  const projectCode = (project?.name ?? 'PROJECT')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);

  return (
    <div className="px-6 py-4 border-b border-border-color bg-background-dark sticky top-0 z-10">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted truncate">
          <span className="text-accent-cyan">[BUBBLES]</span>
          <span className="mx-2 opacity-50">//</span>
          <span className="text-text-primary">{projectCode}</span>
          <span className="mx-2 opacity-50">//</span>
          <span>{page}</span>
        </p>
        {rightSlot && <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>}
      </div>
    </div>
  );
}
