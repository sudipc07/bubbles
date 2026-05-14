import { useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { useAuth, useLogout } from '../lib/auth';
import { useCreateProject, useProjects } from '../lib/projects';

export function ProjectsListPage() {
  const { user } = useAuth();
  const logout = useLogout();
  const projects = useProjects();
  const createProject = useCreateProject();
  const [name, setName] = useState('');

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createProject.mutateAsync(name.trim());
    setName('');
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Bubbles</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-neutral-500">{user?.email}</span>
            {user?.isAdmin && (
              <Link href="/admin" className="text-neutral-700 hover:underline">
                Admin
              </Link>
            )}
            <button
              onClick={() => logout.mutate()}
              className="text-neutral-500 hover:text-neutral-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Projects</h2>
          <p className="text-sm text-neutral-500">
            {projects.data?.length ?? 0} brand{projects.data?.length === 1 ? '' : 's'}
          </p>
        </div>

        <form onSubmit={onCreate} className="flex gap-2 mb-8">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project name (e.g. ResumeFolio)"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
          <button
            type="submit"
            disabled={createProject.isPending || !name.trim()}
            className="rounded-md bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
          >
            {createProject.isPending ? 'Creating…' : 'Create'}
          </button>
        </form>

        {projects.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}

        {projects.data && projects.data.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center">
            <p className="text-neutral-500 text-sm">
              No projects yet. Create your first brand to get started.
            </p>
          </div>
        )}

        {projects.data && projects.data.length > 0 && (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 overflow-hidden">
            {projects.data.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="block px-4 py-3 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-neutral-500 font-mono">{p.slug}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <StatusPill status={p.status} />
                      <span className="text-neutral-500">{p.role}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: 'active' | 'paused' | 'archived' }) {
  const cls = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    paused: 'bg-amber-50 text-amber-700 border-amber-200',
    archived: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  }[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}
