import { Link, useRoute } from 'wouter';
import { useAuth, useLogout } from '../lib/auth';

type NavItem = {
  key: string;
  label: string;
  icon: string; // Material Symbols name
  href: (projectId?: string) => string;
  matchPattern: string; // wouter route pattern
};

const projectNav: NavItem[] = [
  { key: 'dashboard', label: 'DASHBOARD', icon: 'dashboard', href: (p) => `/projects/${p}`, matchPattern: '/projects/:id' },
  { key: 'brand', label: 'BRAND', icon: 'tune', href: (p) => `/projects/${p}/brand`, matchPattern: '/projects/:id/brand' },
  { key: 'posts', label: 'POSTS', icon: 'inbox', href: (p) => `/projects/${p}/drafts`, matchPattern: '/projects/:id/drafts' },
  { key: 'pipeline', label: 'PIPELINE', icon: 'account_tree', href: (p) => `/projects/${p}/pipeline`, matchPattern: '/projects/:id/pipeline' },
  { key: 'settings', label: 'SETTINGS', icon: 'settings', href: (p) => `/projects/${p}/settings`, matchPattern: '/projects/:id/settings' },
];

const globalNav: NavItem[] = [
  { key: 'projects', label: 'PROJECTS', icon: 'apps', href: () => '/', matchPattern: '/' },
];

interface Props {
  projectId?: string;
}

export function SideNav({ projectId }: Props) {
  const { user } = useAuth();
  const logout = useLogout();

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

          <nav className="flex flex-col gap-1">
            {projectId
              ? projectNav.map((item) => (
                  <NavLink key={item.key} item={item} projectId={projectId} />
                ))
              : globalNav.map((item) => (
                  <NavLink key={item.key} item={item} projectId={undefined} />
                ))}
            {user?.isAdmin && (
              <NavLink
                item={{
                  key: 'admin',
                  label: 'ADMIN',
                  icon: 'admin_panel_settings',
                  href: () => '/admin',
                  matchPattern: '/admin',
                }}
                projectId={undefined}
              />
            )}
          </nav>
        </div>

        <div className="flex flex-col gap-3">
          {user && (
            <div className="flex items-center justify-between text-[10px] font-mono text-muted">
              <span className="truncate" title={user.email}>{user.email}</span>
              <button
                onClick={() => logout.mutate()}
                className="text-muted hover:text-accent-red transition-colors uppercase tracking-wider"
              >
                logout
              </button>
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

function NavLink({ item, projectId }: { item: NavItem; projectId: string | undefined }) {
  const [matches] = useRoute(item.matchPattern);
  // Special-case the project dashboard: '/projects/:id' should NOT match
  // subpaths like '/projects/:id/brand'. Wouter routes don't naturally
  // exclude those, so we double-check.
  const isActive = matches && (
    item.matchPattern !== '/projects/:id' ||
    typeof window === 'undefined' ||
    !window.location.pathname.startsWith(`/projects/${projectId}/`)
  );

  const href = item.href(projectId);
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 border-l-[3px] transition-colors ${
        isActive
          ? 'bg-surface-2 border-accent-cyan text-text-primary'
          : 'border-transparent text-muted hover:bg-surface-2 hover:text-text-primary'
      }`}
    >
      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
        {item.icon}
      </span>
      <span className="font-mono text-xs font-medium">{item.label}</span>
    </Link>
  );
}
