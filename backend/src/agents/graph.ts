// The pipeline DAGs. Adding or rewiring agents = editing this file, nothing else.
//
// Both pipelines are declared statically so the frontend can render the graph
// before any runs exist, and so the runAgent wrapper can validate node IDs.

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

export const setupGraph: PipelineGraph = {
  id: 'setup',
  nodes: [
    { id: 'parser', label: 'Parser', llm: 'yes', description: 'PRD / brief → structured product summary' },
    { id: 'audience', label: 'Audience Generator', llm: 'yes', description: 'Generate 4 audience profiles to choose from' },
    { id: 'voice', label: 'Voice Generator', llm: 'yes', description: 'Generate 4 voice directions' },
    { id: 'persona', label: 'Persona Generator', llm: 'yes', description: 'Generate 5 personas' },
    { id: 'theme', label: 'Theme Generator', llm: 'yes', description: 'Generate 8-10 themes' },
    { id: 'brandkit', label: 'Brand Kit', llm: 'no', description: 'Extract palette + select fonts from logo (sharp + vibrant)' },
    { id: 'sample', label: 'Sample Generator', llm: 'yes', description: 'Generate 2 samples per persona for approval' },
  ],
  edges: [
    { from: 'parser', to: 'audience', payload: 'ProductSummary' },
    { from: 'parser', to: 'voice', payload: 'ProductSummary' },
    { from: 'audience', to: 'persona', payload: 'Audience' },
    { from: 'voice', to: 'persona', payload: 'Voice' },
    { from: 'persona', to: 'theme', payload: 'Persona[]' },
    { from: 'parser', to: 'brandkit', payload: 'ProductSummary + Logo' },
    { from: 'persona', to: 'sample', payload: 'Persona[]' },
    { from: 'theme', to: 'sample', payload: 'Theme[]' },
    { from: 'brandkit', to: 'sample', payload: 'BrandKit' },
  ],
};

export const runtimeGraph: PipelineGraph = {
  id: 'runtime',
  nodes: [
    { id: 'planner', label: 'Planner', llm: 'no', description: 'Pick persona, theme, format (arithmetic on weights)' },
    { id: 'researcher', label: 'Researcher', llm: 'yes', description: 'Gather facts + context for the topic' },
    { id: 'writer', label: 'Writer', llm: 'yes', description: 'Produce slide content (carousel) or single-image copy' },
    { id: 'empathy', label: 'Empathy Critic', llm: 'yes', description: 'helpful / performative / tone-deaf judgement' },
    { id: 'safety', label: 'Brand Safety', llm: 'no', description: 'Regex bans, hallucinated-stat check, helpfulness ratio (SQL)' },
    { id: 'editor', label: 'Editor', llm: 'yes', description: 'Refine wording, tighten' },
    { id: 'designer', label: 'Designer', llm: 'no', description: 'Pick template, inject brand kit, render slides via Playwright' },
    { id: 'linkedin', label: 'LinkedIn Packager', llm: 'no', description: 'Format copy, hashtags, char limits' },
    { id: 'instagram', label: 'Instagram Packager', llm: 'no', description: 'Format copy, hashtags, char limits' },
    { id: 'analyst', label: 'Analyst', llm: 'no', description: 'Aggregate past engagement (SQL); optional LLM summary' },
  ],
  edges: [
    { from: 'planner', to: 'researcher', payload: 'Plan' },
    { from: 'researcher', to: 'writer', payload: 'Research' },
    { from: 'writer', to: 'empathy', payload: 'Draft' },
    { from: 'writer', to: 'safety', payload: 'Draft' },
    { from: 'empathy', to: 'editor', payload: 'EmpathyReport' },
    { from: 'safety', to: 'editor', payload: 'SafetyReport' },
    { from: 'editor', to: 'designer', payload: 'FinalCopy' },
    { from: 'designer', to: 'linkedin', payload: 'Slides + Copy' },
    { from: 'designer', to: 'instagram', payload: 'Slides + Copy' },
    { from: 'linkedin', to: 'analyst', payload: 'QueuedBundle' },
    { from: 'instagram', to: 'analyst', payload: 'QueuedBundle' },
  ],
};

export function getGraph(id: 'setup' | 'runtime'): PipelineGraph {
  return id === 'setup' ? setupGraph : runtimeGraph;
}

const nodeIds = new Set<string>([
  ...setupGraph.nodes.map((n) => n.id),
  ...runtimeGraph.nodes.map((n) => n.id),
]);

export function isKnownNode(nodeId: string): boolean {
  return nodeIds.has(nodeId);
}
