import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import type { Project } from '../lib/projects';
import { useTriggerRun } from '../lib/pipeline';
import { useSetupOutputs } from '../lib/setup';

interface Props {
  projectId: string;
  page: 'DASHBOARD' | 'BRAND' | 'POSTS' | 'PIPELINE' | 'SETTINGS' | 'INSPECTOR';
  rightSlot?: React.ReactNode;
}

/**
 * Content-area header for every page inside a project. Sidebar handles nav;
 * this header sits at the top of the main column and carries:
 *   - 'INIT_PIPELINE // PROJECT_NAME // PAGE' uppercase mono breadcrumb
 *   - optional page-specific control (right slot)
 *   - persistent [GENERATE_POST] button — disabled until brand setup is ready
 */
export function ProjectHeader({ projectId, page, rightSlot }: Props) {
  const projectQuery = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => api<{ project: Project }>(`/api/projects/${projectId}`).then((r) => r.project),
  });
  const setup = useSetupOutputs(projectId);
  const setupReady = !!setup.data && setup.data.personas.length > 0 && setup.data.themes.length > 0;
  const trigger = useTriggerRun(projectId);
  const triggerError = trigger.error instanceof ApiError ? trigger.error.message : null;

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
        <div className="flex items-center gap-2 shrink-0">
          {rightSlot}
          <button
            onClick={() => trigger.mutate()}
            disabled={trigger.isPending || !setupReady}
            className="btn-bracket bg-primary text-white px-3 py-1.5 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title={
              !setupReady
                ? 'Run brand setup first (personas + themes required)'
                : 'Real LLM run — produces a draft, ~$0.005 in tokens'
            }
          >
            {trigger.isPending ? 'GENERATING' : 'GENERATE_POST'}
          </button>
        </div>
      </div>
      {triggerError && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-accent-red">
          [ERROR] {triggerError}
        </p>
      )}
    </div>
  );
}
