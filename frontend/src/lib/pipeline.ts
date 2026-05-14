import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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

export type NodeStatus = 'idle' | 'running' | 'done' | 'failed';

export function useLivePipeline(projectId: string | undefined) {
  const [nodeStatus, setNodeStatus] = useState<Record<string, NodeStatus>>({});
  const [lastEvent, setLastEvent] = useState<PipelineEvent | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const es = new EventSource(`/api/events/${projectId}`, { withCredentials: true });
    esRef.current = es;
    es.addEventListener('pipeline', (msg) => {
      try {
        const evt = JSON.parse((msg as MessageEvent).data) as PipelineEvent;
        setLastEvent(evt);
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

  return { nodeStatus, lastEvent };
}
