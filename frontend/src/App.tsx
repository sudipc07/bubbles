import { useQuery } from '@tanstack/react-query';

type Health = { ok: boolean; service: string };

async function fetchHealth(): Promise<Health> {
  const res = await fetch('/api/healthz');
  if (!res.ok) throw new Error(`healthz ${res.status}`);
  return res.json();
}

export function App() {
  const { data, isLoading, error } = useQuery({ queryKey: ['health'], queryFn: fetchHealth });

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Bubbles</h1>
        <p className="text-neutral-600">
          Autonomous content generation for brands. Multi-tenant. AI-driven. Operator-owned.
        </p>
        <div className="mt-8 text-sm font-mono text-neutral-500">
          {isLoading && <span>checking api…</span>}
          {error && <span className="text-red-600">api unreachable</span>}
          {data && (
            <span className="text-emerald-600">
              api: {data.service} ✓
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
