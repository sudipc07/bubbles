import { useEffect, useState, type ReactNode } from 'react';
import { useLivePipeline } from '../lib/pipeline';
import { SideNav } from './SideNav';

interface Props {
  children: ReactNode;
  projectId?: string;
}

/**
 * Three-row, two-column shell with the cyber-terminal aesthetic:
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │  SIDEBAR  │              MAIN CONTENT                │
 *   │           │                                          │
 *   ├──────────────────────────────────────────────────────┤
 *   │  [SYS_LOG] > <latest event tail>                     │
 *   └──────────────────────────────────────────────────────┘
 */
export function AppShell({ children, projectId }: Props) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background-dark text-text-primary">
      <div className="flex flex-1 min-h-0">
        <SideNav projectId={projectId} />
        <main className="flex-1 overflow-y-auto scroll-thin">{children}</main>
      </div>
      <SysLogStrip projectId={projectId} />
    </div>
  );
}

function SysLogStrip({ projectId }: { projectId: string | undefined }) {
  const { events } = useLivePipeline(projectId);
  const last = events.length > 0 ? events[events.length - 1]! : null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  void now;

  return (
    <footer className="shrink-0 border-t border-border-color bg-surface px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted flex items-center gap-3 overflow-hidden">
      <span className="text-accent-cyan">[SYS_LOG]</span>
      <span className="opacity-60">&gt;</span>
      {last ? (
        <span className="truncate">
          <span className="text-text-primary">{fmtTime(last.at)}</span>{' '}
          <span className="text-accent-cyan">[{last.agentName.toUpperCase().replace(/\s+/g, '_')}]</span>{' '}
          <span className="opacity-70">{last.eventType}</span>
          {last.durationMs != null && <span className="opacity-50"> · {last.durationMs}ms</span>}
        </span>
      ) : (
        <span className="opacity-60">Connection secure. Agents idle. Awaiting input.</span>
      )}
      <span className="ml-auto opacity-50">{events.length} events / session</span>
    </footer>
  );
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
