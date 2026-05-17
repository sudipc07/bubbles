import { useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { useCreateProject, useProjects } from '../lib/projects';

export function ProjectsListPage() {
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
    <div className="min-h-full">
      {/* Page chrome */}
      <div className="px-6 py-4 border-b border-border-color bg-background-dark sticky top-0 z-10">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
          <span className="text-accent-cyan">[BUBBLES]</span>
          <span className="mx-2 opacity-50">//</span>
          <span>PROJECTS</span>
        </p>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <header className="flex items-baseline justify-between mb-2">
          <h1 className="font-display text-3xl font-bold tracking-tight">Active Pipelines</h1>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
            GLOBAL_STATUS: NOMINAL · PIPELINES: {projects.data?.length ?? 0}
          </p>
        </header>
        <hr className="border-border-color mb-6" />

        {projects.isLoading && (
          <p className="font-mono text-xs uppercase tracking-wider text-muted">[LOADING] // Fetching projects…</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.data?.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group relative block rounded-xl border border-border-color bg-surface p-4 hover:border-accent-cyan/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h2 className="font-display font-bold text-lg truncate">{p.name}</h2>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted mt-0.5 truncate">
                    {p.slug}
                  </p>
                </div>
                <StatusPill status={p.status} />
              </div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                MONTHLY_CAP: <span className="text-text-primary">${p.monthlyCostCeilingUsd}</span>
                <span className="mx-2 opacity-50">·</span>
                ROLE: <span className="text-text-primary">{p.role}</span>
              </p>
            </Link>
          ))}

          {/* "New pipeline" card */}
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('new-project-input') as HTMLInputElement | null;
              el?.focus();
            }}
            className="rounded-xl border border-dashed border-border-color bg-transparent p-4 flex flex-col items-center justify-center gap-2 min-h-[140px] text-muted hover:border-accent-cyan/60 hover:text-text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-3xl">add_circle</span>
            <span className="font-mono text-xs uppercase tracking-wider">NEW_PIPELINE</span>
          </button>
        </div>

        <form onSubmit={onCreate} className="mt-8 flex gap-2 max-w-xl">
          <input
            id="new-project-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name (e.g. ResumeFolio)"
            className="flex-1 bg-surface border border-border-color rounded px-3 py-2 text-sm font-mono text-text-primary placeholder-muted focus:outline-none focus:border-accent-cyan transition-colors"
          />
          <button
            type="submit"
            disabled={createProject.isPending || !name.trim()}
            className="btn-bracket bg-primary text-white px-4 py-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {createProject.isPending ? 'CREATING' : 'INITIATE_PROJECT'}
          </button>
        </form>
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: 'active' | 'paused' | 'archived' }) {
  const variant =
    status === 'active' ? 'status-pill-emerald' : status === 'paused' ? 'status-pill-amber' : 'status-pill-muted';
  return <span className={`status-pill ${variant}`}>{status}</span>;
}
