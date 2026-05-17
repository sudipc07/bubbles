import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  const qc = useQueryClient();
  const tenants = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: () => api<{ tenants: Tenant[] }>('/api/admin/tenants').then((r) => r.tenants),
  });
  const costs = useQuery({
    queryKey: ['admin', 'costs', 'summary'],
    queryFn: () => api<{ last30d: number; last7d: number }>('/api/admin/costs/summary'),
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'paused' | 'archived' }) =>
      api(`/api/admin/tenants/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-border-color">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted hover:text-text-primary text-sm">
              ← Projects
            </Link>
            <span className="text-muted text-sm">/</span>
            <h1 className="text-lg font-semibold">Admin</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
            Platform spend
          </h2>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <CostCard label="Last 30 days" value={costs.data?.last30d} />
            <CostCard label="Last 7 days" value={costs.data?.last7d} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
            Tenants ({tenants.data?.length ?? 0})
          </h2>
          {tenants.isLoading && <p className="text-sm text-muted">Loading…</p>}
          {tenants.data && tenants.data.length === 0 && (
            <p className="text-sm text-muted">No tenants yet.</p>
          )}
          {tenants.data && tenants.data.length > 0 && (
            <div className="rounded-lg border border-border-color overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <Th>Project</Th>
                    <Th>Owner</Th>
                    <Th>Status</Th>
                    <Th className="text-right">30d spend</Th>
                    <Th className="text-right">Ceiling</Th>
                    <Th>Last run</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {tenants.data.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-2">
                      <Td>
                        <Link href={`/projects/${t.id}`} className="font-medium hover:underline">
                          {t.name}
                        </Link>
                        <p className="text-xs text-muted font-mono">{t.slug}</p>
                      </Td>
                      <Td className="text-muted">{t.ownerEmail}</Td>
                      <Td>
                        <select
                          value={t.status}
                          disabled={setStatus.isPending}
                          onChange={(e) =>
                            setStatus.mutate({
                              id: t.id,
                              status: e.target.value as 'active' | 'paused' | 'archived',
                            })
                          }
                          className="rounded-md border border-border-color bg-surface px-2 py-1 text-xs"
                        >
                          <option value="active">active</option>
                          <option value="paused">paused</option>
                          <option value="archived">archived</option>
                        </select>
                      </Td>
                      <Td className="text-right font-mono">${t.monthlySpendUsd.toFixed(2)}</Td>
                      <Td className="text-right font-mono text-muted">${t.monthlyCostCeilingUsd}</Td>
                      <Td className="text-xs text-muted">
                        {t.lastRunAt ? (
                          <>
                            {new Date(t.lastRunAt).toLocaleString()}{' '}
                            <span className="font-mono text-muted">· {t.lastRunStatus}</span>
                          </>
                        ) : (
                          <span className="text-muted">never</span>
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
    <div className="rounded-lg border border-border-color p-4">
      <p className="text-xs text-muted">{label}</p>
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

