import { Route, Switch, useRoute } from 'wouter';
import { AuthProvider, useAuth } from './lib/auth';
import { LoginPage } from './pages/Login';
import { ProjectsListPage } from './pages/ProjectsList';
import { DashboardPage } from './pages/Dashboard';
import { BrandPage } from './pages/Brand';
import { PipelinePage } from './pages/Pipeline';
import { DraftsPage } from './pages/Drafts';
import { DraftDetailPage } from './pages/DraftDetail';
import { AdminTenantsPage } from './pages/AdminTenants';
import { AppShell } from './components/AppShell';

export function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background-dark text-muted font-mono text-xs uppercase tracking-wider">
        [BOOTING] // Authenticating session…
      </main>
    );
  }

  if (!user) return <LoginPage />;

  return <Shell />;
}

/**
 * Wrap every authed route with AppShell. AppShell wants to know the projectId
 * so the sidebar can show project-scoped nav. We extract it via wouter useRoute.
 */
function Shell() {
  const [, projectParams] = useRoute<{ id?: string }>('/projects/:id/:rest*');
  const [, projectBaseParams] = useRoute<{ id: string }>('/projects/:id');
  const projectId = projectParams?.id ?? projectBaseParams?.id;

  return (
    <AppShell projectId={projectId}>
      <Switch>
        <Route path="/" component={ProjectsListPage} />
        <Route path="/projects/:id" component={DashboardPage} />
        <Route path="/projects/:id/brand" component={BrandPage} />
        <Route path="/projects/:id/pipeline" component={PipelinePage} />
        <Route path="/projects/:id/drafts" component={DraftsPage} />
        <Route path="/projects/:id/drafts/:draftId" component={DraftDetailPage} />
        <Route path="/projects/:id/settings">
          <NotImplemented label="SETTINGS" />
        </Route>
        <Route path="/admin">
          <AdminGate />
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </AppShell>
  );
}

function AdminGate() {
  const { user } = useAuth();
  return user?.isAdmin ? <AdminTenantsPage /> : <NotFound />;
}

function NotFound() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center text-muted font-mono text-xs uppercase tracking-wider">
      [404] // Not found
    </main>
  );
}

function NotImplemented({ label }: { label: string }) {
  return (
    <main className="min-h-[60vh] flex items-center justify-center text-muted font-mono text-xs uppercase tracking-wider">
      [{label}] // Coming in a later commit
    </main>
  );
}
