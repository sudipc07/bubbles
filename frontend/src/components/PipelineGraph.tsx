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
    if (visiting.has(id)) return 0;
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

// Inline styles, not Tailwind classes — React Flow overrides classes with its
// own default inline node styling (white bg, dark text). Going inline is the
// only reliable way to get dark-theme nodes.
const STATUS_STYLES: Record<NodeStatus, React.CSSProperties> = {
  idle: {
    background: '#12141D', // surface
    border: '2px solid #2A2F3D', // border-color
    color: '#94A3B8', // muted-bright
  },
  running: {
    background: 'rgba(6, 182, 212, 0.12)',
    border: '2px solid #06B6D4',
    color: '#06B6D4',
    boxShadow: '0 0 12px rgba(6, 182, 212, 0.4)',
  },
  done: {
    background: 'rgba(16, 185, 129, 0.12)',
    border: '2px solid #10B981',
    color: '#10B981',
  },
  failed: {
    background: 'rgba(239, 68, 68, 0.14)',
    border: '2px solid #EF4444',
    color: '#EF4444',
  },
};

export function PipelineGraphView({ graph, nodeStatus }: Props) {
  const positions = useMemo(() => layout(graph), [graph]);

  const nodes: Node[] = useMemo(
    () =>
      graph.nodes.map((n) => {
        const status = nodeStatus[n.id] ?? 'idle';
        const s = STATUS_STYLES[status];
        return {
          id: n.id,
          position: positions.get(n.id) ?? { x: 0, y: 0 },
          data: { label: n.label },
          type: 'default',
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          style: {
            ...s,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            borderRadius: 6,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
          className: status === 'running' ? 'animate-pulse' : '',
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
        labelStyle: {
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          fill: '#94A3B8',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 4,
        labelBgStyle: { fill: '#12141D', fillOpacity: 0.95, stroke: '#2A2F3D' },
        style: { stroke: '#2A2F3D', strokeWidth: 1.5 },
      })),
    [graph.edges],
  );

  return (
    <div className="h-[380px] w-full rounded-lg border border-border-color bg-background-dark">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnDoubleClick={false}
        panOnDrag
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} color="#1F2330" />
      </ReactFlow>
    </div>
  );
}
