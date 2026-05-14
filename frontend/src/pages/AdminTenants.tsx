import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { api } from '../lib/api';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'paused' | 'archived';
  ownerEmail: string;
  monthlyCostCeilingUsd: number;
  monthlySpendUsd: number;
  lastRunAt: string | null;
  lastRunStatus: 'running' | 'completed' | 'failed' | null;
  createdAt: string;
}

export function AdminTenantsPage() {
  const tenants = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: () => api<{ tenants: Tenant[] }>('/api/admin/tenants').then((r) => r.tenants),
  });
  const costs = useQuery({
    queryKey: ['admin', 'costs', 'summary'],
    queryFn: () => api<{ last30d: number; last7d: number }>('/api/admin/costs/summary'),
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-neutral-500 hover:text-neutral-900 text-sm">
              ← Projects
            </Link>
            <span className="text-neutral-300 text-sm">/</span>
            <h1 className="text-lg font-semibold">Admin</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-3">
            Platform spend
          </h2>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <CostCard label="Last 30 days" value={costs.data?.last30d} />
            <CostCard label="Last 7 days" value={costs.data?.last7d} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-3">
            Tenants ({tenants.data?.length ?? 0})
          </h2>
          {tenants.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
          {tenants.data && tenants.data.length === 0 && (
            <p className="text-sm text-neutral-500">No tenants yet.</p>
          )}
          {tenants.data && tenants.data.length > 0 && (
            <div className="rounded-lg border border-neutral-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <Th>Project</Th>
                    <Th>Owner</Th>
                    <Th>Status</Th>
                    <Th className="text-right">30d spend</Th>
                    <Th className="text-right">Ceiling</Th>
                    <Th>Last run</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {tenants.data.map((t) => (
                    <tr key={t.id} className="hover:bg-neutral-50">
                      <Td>
                        <Link href={`/projects/${t.id}`} className="font-medium hover:underline">
                          {t.name}
                        </Link>
                        <p className="text-xs text-neutral-500 font-mono">{t.slug}</p>
                      </Td>
                      <Td className="text-neutral-600">{t.ownerEmail}</Td>
                      <Td>
                        <StatusPill status={t.status} />
                      </Td>
                      <Td className="text-right font-mono">${t.monthlySpendUsd.toFixed(2)}</Td>
                      <Td className="text-right font-mono text-neutral-500">${t.monthlyCostCeilingUsd}</Td>
                      <Td className="text-xs text-neutral-500">
                        {t.lastRunAt ? (
                          <>
                            {new Date(t.lastRunAt).toLocaleString()}{' '}
                            <span className="font-mono text-neutral-400">· {t.lastRunStatus}</span>
                          </>
                        ) : (
                          <span className="text-neutral-400">never</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function CostCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold font-mono">
        {value == null ? '…' : `$${value.toFixed(2)}`}
      </p>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left px-3 py-2 font-medium ${className ?? ''}`}>{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top ${className ?? ''}`}>{children}</td>;
}

function StatusPill({ status }: { status: 'active' | 'paused' | 'archived' }) {
  const cls = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    paused: 'bg-amber-50 text-amber-700 border-amber-200',
    archived: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  }[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {status}
    </span>
  );
}
