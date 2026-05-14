// Provider-abstracted LLM module. Phase 3 ships the public shape + cost
// ledger plumbing; the actual OpenAI calls land in Phase 4 once we have an
// agent that needs them.
//
// Two functions only — completions and embeddings. Anything else (regex,
// palette extraction, SQL counts, formatting) lives in lib/, NOT here.

import { db } from '../db/index.js';
import { llmCalls } from '../db/schema.js';
import { newId } from '../lib/id.js';

export interface CompleteInput {
  model?: string;
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CompleteResult {
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  usdCost: number;
  latencyMs: number;
}

export interface CallContext {
  projectId: string;
  runId?: string;
  nodeId: string;
}

export async function complete(_ctx: CallContext, _input: CompleteInput): Promise<CompleteResult> {
  // Phase 4: real OpenAI call here.
  throw new Error('llm.complete: not implemented yet (Phase 4)');
}

export async function embed(_ctx: CallContext, _text: string): Promise<{ vector: number[]; usdCost: number }> {
  // Phase 4: real OpenAI embeddings call here.
  throw new Error('llm.embed: not implemented yet (Phase 4)');
}

export async function recordLlmCall(input: {
  ctx: CallContext;
  kind: 'complete' | 'embed';
  model: string;
  promptTokens: number;
  completionTokens: number;
  usdCost: number;
  latencyMs: number;
}): Promise<void> {
  await db.insert(llmCalls).values({
    id: newId(),
    runId: input.ctx.runId ?? null,
    projectId: input.ctx.projectId,
    nodeId: input.ctx.nodeId,
    kind: input.kind,
    model: input.model,
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    totalTokens: input.promptTokens + input.completionTokens,
    usdCost: input.usdCost.toFixed(6),
    latencyMs: input.latencyMs,
  });
}
