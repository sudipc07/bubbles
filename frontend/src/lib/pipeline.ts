import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export interface GraphNode {
  id: string;
  label: string;
  llm: 'yes' | 'no' | 'mixed';
  description: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  payload: string;
}

export interface PipelineGraph {
  id: 'setup' | 'runtime';
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface AgentRun {
  id: string;
  projectId: string;
  pipeline: 'setup' | 'runtime';
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
}

export interface PipelineEvent {
  runId: string;
  projectId: string;
  nodeId: string;
  agentName: string;
  eventType: 'started' | 'finished' | 'failed' | 'skipped';
  durationMs?: number;
  errorMessage?: string;
  at: string;
}

export function useGraph(id: 'setup' | 'runtime' = 'runtime') {
  return useQuery({
    queryKey: ['pipeline', 'graph', id],
    queryFn: () => api<{ graph: PipelineGraph }>(`/api/pipeline/graph?id=${id}`).then((r) => r.graph),
    staleTime: Infinity,
  });
}

export function useRuns(projectId: string | undefined) {
  return useQuery({
    enabled: !!projectId,
    queryKey: ['pipeline', 'runs', projectId],
    queryFn: () =>
      api<{ runs: AgentRun[]; monthlySpendUsd: number }>(`/api/pipeline/${projectId}/runs`),
  });
}

export function useTriggerRun(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{ runId: string; remaining: number }>(`/api/pipeline/${projectId}/runs`, {
        method: 'POST',
      }),
    onSuccess: () => {
      // Refresh runs list immediately; live events will arrive via SSE.
      qc.invalidateQueries({ queryKey: ['pipeline', 'runs', projectId] });
    },
  });
}

export type NodeStatus = 'idle' | 'running' | 'done' | 'failed';

const MAX_EVENTS_BUFFER = 200;

export function useLivePipeline(projectId: string | undefined) {
  const [nodeStatus, setNodeStatus] = useState<Record<string, NodeStatus>>({});
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const currentRunIdRef = useRef<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const es = new EventSource(`/api/events/${projectId}`, { withCredentials: true });
    esRef.current = es;
    es.addEventListener('pipeline', (msg) => {
      try {
        const evt = JSON.parse((msg as MessageEvent).data) as PipelineEvent;

        // Detect a new run starting (first 'started' event of a new runId)
        // and reset graph node colours so we don't carry stale 'done' states
        // from the previous run.
        if (evt.runId !== currentRunIdRef.current && evt.eventType === 'started') {
          currentRunIdRef.current = evt.runId;
          setNodeStatus({ [evt.nodeId]: 'running' });
        } else {
          setNodeStatus((prev) => ({
            ...prev,
            [evt.nodeId]:
              evt.eventType === 'started'
                ? 'running'
                : evt.eventType === 'finished'
                  ? 'done'
                  : evt.eventType === 'failed'
                    ? 'failed'
                    : 'idle',
          }));
        }

        setEvents((prev) => {
          const next = [...prev, evt];
          return next.length > MAX_EVENTS_BUFFER ? next.slice(-MAX_EVENTS_BUFFER) : next;
        });
      } catch (err) {
        console.error('SSE parse error', err);
      }
    });
    es.onerror = () => {
      // Browser will auto-reconnect; nothing to do.
    };
    return () => {
      es.close();
      esRef.current = null;
    };
  }, [projectId]);

  const lastEvent = events.length > 0 ? events[events.length - 1]! : null;

  return { nodeStatus, lastEvent, events };
}
