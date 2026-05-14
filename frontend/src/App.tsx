import { Route, Switch } from 'wouter';
import { AuthProvider, useAuth } from './lib/auth';
import { LoginPage } from './pages/Login';
import { ProjectsListPage } from './pages/ProjectsList';
import { ProjectDetailPage } from './pages/ProjectDetail';
import { PipelinePage } from './pages/Pipeline';
import { AdminTenantsPage } from './pages/AdminTenants';

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
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-neutral-400">Loading…</p>
      </main>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <Switch>
      <Route path="/" component={ProjectsListPage} />
      <Route path="/projects/:id" component={ProjectDetailPage} />
      <Route path="/projects/:id/pipeline" component={PipelinePage} />
      <Route path="/admin">{user.isAdmin ? <AdminTenantsPage /> : <NotFound />}</Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-neutral-500">Not found.</p>
    </main>
  );
}
