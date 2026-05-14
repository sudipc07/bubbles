import { EventEmitter } from 'node:events';

// In-process event bus for SSE fan-out. One emitter, one channel per project.
// At MVP scale (~6 projects, few connected clients per project), this is plenty.
// If we ever go horizontal, swap this module for a Redis pub/sub adapter — no
// other code needs to change.

const bus = new EventEmitter();
bus.setMaxListeners(100);

export interface PipelineEvent {
  runId: string;
  projectId: string;
  nodeId: string;
  agentName: string;
  eventType: 'started' | 'finished' | 'failed' | 'skipped';
  durationMs?: number;
  errorMessage?: string;
  at: string; // ISO timestamp
}

const channel = (projectId: string) => `events:${projectId}`;

export function publish(event: PipelineEvent): void {
  bus.emit(channel(event.projectId), event);
}

export function subscribe(projectId: string, listener: (e: PipelineEvent) => void): () => void {
  const ch = channel(projectId);
  bus.on(ch, listener);
  return () => bus.off(ch, listener);
}
