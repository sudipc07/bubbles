import { Link, useLocation, useRoute } from 'wouter';
import { useAuth, useLogout } from '../lib/auth';
import { useDrafts } from '../lib/drafts';
import { useSetupOutputs } from '../lib/setup';

interface NavItem {
  key: string;
  step: string | null; // "01", "02", "03" or null for non-workflow items
  label: string;
  icon: string;
  href: string;
  match: string;
  badge?: { text: string; tone: 'cyan' | 'amber' | 'emerald' };
  done?: boolean;
}

interface Props {
  projectId?: string;
}

export function SideNav({ projectId }: Props) {
  const { user } = useAuth();
  const logout = useLogout();
  const [location] = useLocation();
  const inAdmin = location.startsWith('/admin');

  // Pull live state for the workflow indicators
  const drafts = useDrafts(projectId, 'pending');
  const setup = useSetupOutputs(projectId);

  const pendingCount = drafts.data?.length ?? 0;
  const setupReady =
    !!setup.data && setup.data.personas.length > 0 && setup.data.themes.length > 0;

  const workflow: NavItem[] = projectId
    ? [
        {
          key: 'brand',
          step: '01',
          label: 'BRAND',
          icon: 'tune',
          href: `/projects/${projectId}/brand`,
          match: '/projects/:id/brand',
          done: setupReady,
        },
        {
          key: 'generate',
          step: '02',
          label: 'GENERATE',
          icon: 'auto_awesome',
          href: `/projects/${projectId}/pipeline`,
          match: '/projects/:id/pipeline',
        },
        {
          key: 'review',
          step: '03',
          label: 'REVIEW',
          icon: 'inbox',
          href: `/projects/${projectId}/drafts`,
          match: '/projects/:id/drafts',
          badge: pendingCount > 0 ? { text: String(pendingCount), tone: 'amber' } : undefined,
        },
      ]
    : [];

  // Project-scope sidebar = workflow + ops. Admin is intentionally NOT here:
  // it lives at the root context so jumping to it is an explicit "leave the
  // project" action via the projects list, not a sidebar-shape mutation.
  const ops: NavItem[] = projectId
    ? [
        { key: 'dashboard', step: null, label: 'DASHBOARD', icon: 'dashboard', href: `/projects/${projectId}`, match: '/projects/:id' },
        { key: 'settings', step: null, label: 'SETTINGS', icon: 'settings', href: `/projects/${projectId}/settings`, match: '/projects/:id/settings' },
      ]
    : [
        { key: 'projects', step: null, label: 'PROJECTS', icon: 'apps', href: '/', match: '/' },
      ];

  // At root scope (no project), admins also see the admin entry as a peer
  // of Projects. Inside a project, they don't — they back out first.
  if (!projectId && user?.isAdmin) {
    ops.push({
      key: 'admin',
      step: null,
      label: 'ADMIN',
      icon: 'admin_panel_settings',
      href: '/admin',
      match: '/admin',
    });
  }

  return (
    <aside className="relative flex h-full w-[240px] flex-col bg-surface border-r border-border-color shrink-0 font-body">
      <div className="flex flex-col h-full justify-between p-4">
        <div className="flex flex-col gap-6">
          <Link href={projectId ? `/projects/${projectId}` : '/'} className="flex items-center gap-2 hover:opacity-90">
            <img src="/bubbles-logo.png" alt="Bubbles" className="h-8 w-8 object-contain" />
            <span className="bubbles-gradient font-display text-2xl font-bold tracking-wider uppercase">
              Bubbles
            </span>
          </Link>

          {projectId && (
            <p className="text-muted font-mono text-[10px] uppercase tracking-wider -mt-3">
              Project: <span className="text-text-primary">{projectId.slice(0, 6).toUpperCase()}</span>
            </p>
          )}

          {inAdmin && (
            <div className="-mt-3 rounded border border-accent-amber/40 bg-accent-amber/10 px-2 py-1.5 flex items-center gap-2">
              <span className="material-symbols-outlined text-accent-amber text-[16px]">shield_person</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent-amber font-semibold">
                Admin Mode
              </span>
            </div>
          )}

          {workflow.length > 0 && (
            <div>
              <SectionLabel>WORKFLOW</SectionLabel>
              <nav className="flex flex-col gap-1 mt-1">
                {workflow.map((item) => (
                  <WorkflowLink key={item.key} item={item} />
                ))}
              </nav>
            </div>
          )}

          <div>
            <SectionLabel>{projectId ? 'OPS' : 'NAV'}</SectionLabel>
            <nav className="flex flex-col gap-1 mt-1">
              {ops.map((item) => (
                <SimpleLink key={item.key} item={item} />
              ))}
            </nav>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {user && (
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-muted">
              <span className="truncate flex-1 min-w-0" title={user.email}>{user.email}</span>
              <div className="flex items-center gap-2 shrink-0">
                {projectId && user.isAdmin && !inAdmin && (
                  <Link
                    href="/admin"
                    className="material-symbols-outlined text-muted hover:text-accent-amber text-[16px] transition-colors"
                    title="Switch to admin mode"
                  >
                    shield_person
                  </Link>
                )}
                <button
                  onClick={() => logout.mutate()}
                  className="text-muted hover:text-accent-red transition-colors uppercase tracking-wider"
                >
                  logout
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 p-2 rounded bg-background-dark border border-border-color">
            <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
            <span className="font-mono text-[10px] text-muted uppercase tracking-wider">System Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted/70 px-1">
      {children}
    </p>
  );
}

function WorkflowLink({ item }: { item: NavItem }) {
  const [active] = useRoute(item.match);
  return (
    <Link
      href={item.href}
      className={`relative flex items-center gap-3 px-3 py-2 border-l-[3px] transition-colors ${
        active
          ? 'bg-surface-2 border-accent-cyan text-text-primary'
          : 'border-transparent text-muted hover:bg-surface-2 hover:text-text-primary'
      }`}
    >
      <span className="font-mono text-[10px] font-semibold text-muted w-5 shrink-0">
        {item.step}
      </span>
      <span
        className="material-symbols-outlined text-[18px] shrink-0"
        style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
      >
        {item.icon}
      </span>
      <span className="font-mono text-xs font-medium flex-1">{item.label}</span>
      {item.done && (
        <span
          className="material-symbols-outlined text-accent-emerald text-[16px]"
          title="Complete"
        >
          check_circle
        </span>
      )}
      {item.badge && (
        <span
          className={`status-pill ${
            item.badge.tone === 'amber'
              ? 'status-pill-amber'
              : item.badge.tone === 'emerald'
                ? 'status-pill-emerald'
                : 'status-pill-cyan'
          } !px-1.5 !py-0`}
        >
          {item.badge.text}
        </span>
      )}
    </Link>
  );
}

function SimpleLink({ item }: { item: NavItem }) {
  const [active] = useRoute(item.match);
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2 border-l-[3px] transition-colors ${
        active
          ? 'bg-surface-2 border-accent-cyan text-text-primary'
          : 'border-transparent text-muted hover:bg-surface-2 hover:text-text-primary'
      }`}
    >
      <span
        className="material-symbols-outlined text-[18px] shrink-0"
        style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
      >
        {item.icon}
      </span>
      <span className="font-mono text-xs font-medium">{item.label}</span>
    </Link>
  );
}
