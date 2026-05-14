import { useMemo } from 'react';
import {
  Background,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { NodeStatus, PipelineGraph } from '../lib/pipeline';

interface Props {
  graph: PipelineGraph;
  nodeStatus: Record<string, NodeStatus>;
}

const NODE_WIDTH = 170;
const NODE_HEIGHT = 56;
const COL_GAP = 210;
const ROW_GAP = 90;

// Simple longest-path layering for a DAG: each node's column is 1 + max(parents).
function layout(graph: PipelineGraph): Map<string, { x: number; y: number }> {
  const parents = new Map<string, string[]>();
  graph.nodes.forEach((n) => parents.set(n.id, []));
  graph.edges.forEach((e) => parents.get(e.to)?.push(e.from));

  const depth = new Map<string, number>();
  const compute = (id: string, visiting: Set<string>): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (visiting.has(id)) return 0; // cycle guard, shouldn't happen for our DAGs
    visiting.add(id);
    const p = parents.get(id) ?? [];
    const d = p.length === 0 ? 0 : Math.max(...p.map((q) => compute(q, visiting))) + 1;
    visiting.delete(id);
    depth.set(id, d);
    return d;
  };
  graph.nodes.forEach((n) => compute(n.id, new Set()));

  const byCol = new Map<number, string[]>();
  graph.nodes.forEach((n) => {
    const d = depth.get(n.id)!;
    if (!byCol.has(d)) byCol.set(d, []);
    byCol.get(d)!.push(n.id);
  });

  const positions = new Map<string, { x: number; y: number }>();
  byCol.forEach((ids, col) => {
    ids.forEach((id, row) => {
      positions.set(id, {
        x: col * COL_GAP,
        y: (row - (ids.length - 1) / 2) * ROW_GAP,
      });
    });
  });

  return positions;
}

const statusColors: Record<NodeStatus, { border: string; bg: string; text: string }> = {
  idle: { border: 'border-neutral-300', bg: 'bg-white', text: 'text-neutral-700' },
  running: { border: 'border-blue-400', bg: 'bg-blue-50', text: 'text-blue-800' },
  done: { border: 'border-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-800' },
  failed: { border: 'border-red-400', bg: 'bg-red-50', text: 'text-red-800' },
};

export function PipelineGraphView({ graph, nodeStatus }: Props) {
  const positions = useMemo(() => layout(graph), [graph]);

  const nodes: Node[] = useMemo(
    () =>
      graph.nodes.map((n) => {
        const status = nodeStatus[n.id] ?? 'idle';
        const c = statusColors[status];
        return {
          id: n.id,
          position: positions.get(n.id) ?? { x: 0, y: 0 },
          data: { label: n.label, status, llm: n.llm },
          type: 'default',
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          style: {
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
          },
          className: `rounded-lg border-2 ${c.border} ${c.bg} ${c.text} text-sm font-medium ${
            status === 'running' ? 'animate-pulse' : ''
          }`,
        };
      }),
    [graph.nodes, positions, nodeStatus],
  );

  const edges: Edge[] = useMemo(
    () =>
      graph.edges.map((e, i) => ({
        id: `${e.from}-${e.to}-${i}`,
        source: e.from,
        target: e.to,
        type: 'smoothstep',
        label: e.payload,
        labelStyle: { fontSize: 10, fill: '#737373' },
        labelBgPadding: [4, 2],
        labelBgStyle: { fill: '#fafafa', fillOpacity: 0.9 },
        style: { stroke: '#a3a3a3', strokeWidth: 1.5 },
      })),
    [graph.edges],
  );

  return (
    <div className="h-[600px] w-full rounded-lg border border-neutral-200 bg-neutral-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnDoubleClick={false}
      >
        <Background gap={20} size={1} color="#e5e5e5" />
      </ReactFlow>
    </div>
  );
}
