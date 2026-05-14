import OpenAI from 'openai';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { llmCalls, projects } from '../db/schema.js';
import { projectMonthlySpendUsd } from '../db/repos/pipelineRuns.js';
import { newId } from '../lib/id.js';
import {
  computeUsdCost,
  DEFAULT_COMPLETE_MODEL,
  DEFAULT_EMBED_MODEL,
} from './pricing.js';

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set on the server');
  }
  client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

export class CostCeilingExceeded extends Error {
  constructor(
    public projectId: string,
    public spentUsd: number,
    public ceilingUsd: number,
  ) {
    super(`cost_ceiling_exceeded:$${spentUsd.toFixed(4)}/$${ceilingUsd}`);
    this.name = 'CostCeilingExceeded';
  }
}

async function assertWithinCeiling(projectId: string): Promise<void> {
  const rows = await db
    .select({ ceiling: projects.monthlyCostCeilingUsd })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  const ceiling = rows[0]?.ceiling ?? env.DEFAULT_MONTHLY_COST_CEILING_USD;
  const spent = await projectMonthlySpendUsd(projectId);
  if (spent >= ceiling) throw new CostCeilingExceeded(projectId, spent, ceiling);
}

export interface CallContext {
  projectId: string;
  runId?: string;
  nodeId: string;
}

export interface CompleteInput {
  model?: string;
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  /** Force the model to return valid JSON. The result.json field will be parsed. */
  jsonMode?: boolean;
}

export interface CompleteResult {
  text: string;
  json?: unknown;
  model: string;
  promptTokens: number;
  completionTokens: number;
  usdCost: number;
  latencyMs: number;
}

export async function complete(ctx: CallContext, input: CompleteInput): Promise<CompleteResult> {
  await assertWithinCeiling(ctx.projectId);

  const model = input.model ?? DEFAULT_COMPLETE_MODEL;
  const messages: { role: 'system' | 'user'; content: string }[] = [];
  if (input.system) messages.push({ role: 'system', content: input.system });
  messages.push({ role: 'user', content: input.user });

  const started = Date.now();
  const response = await getClient().chat.completions.create({
    model,
    messages,
    temperature: input.temperature ?? 0.7,
    max_tokens: input.maxTokens ?? 2000,
    ...(input.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
  });
  const latencyMs = Date.now() - started;

  const text = response.choices[0]?.message?.content ?? '';
  const promptTokens = response.usage?.prompt_tokens ?? 0;
  const completionTokens = response.usage?.completion_tokens ?? 0;
  const usdCost = computeUsdCost(model, promptTokens, completionTokens);

  let json: unknown | undefined;
  if (input.jsonMode) {
    try {
      json = JSON.parse(text);
    } catch {
      // leave json undefined; caller can decide whether to fail
    }
  }

  await recordLlmCall({ ctx, kind: 'complete', model, promptTokens, completionTokens, usdCost, latencyMs });

  return { text, json, model, promptTokens, completionTokens, usdCost, latencyMs };
}

export interface EmbedResult {
  vector: number[];
  model: string;
  usdCost: number;
  latencyMs: number;
}

export async function embed(ctx: CallContext, text: string, model: string = DEFAULT_EMBED_MODEL): Promise<EmbedResult> {
  await assertWithinCeiling(ctx.projectId);

  const started = Date.now();
  const response = await getClient().embeddings.create({ model, input: text });
  const latencyMs = Date.now() - started;

  const vector = response.data[0]?.embedding ?? [];
  const promptTokens = response.usage?.prompt_tokens ?? 0;
  const usdCost = computeUsdCost(model, promptTokens, 0);

  await recordLlmCall({ ctx, kind: 'embed', model, promptTokens, completionTokens: 0, usdCost, latencyMs });

  return { vector, model, usdCost, latencyMs };
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

/**
 * Strict JSON helper: runs complete() in jsonMode, validates the response with the
 * provided Zod schema, throws on shape mismatch. Use this for every setup-time
 * and runtime agent that produces structured output.
 */
import type { ZodTypeAny, z } from 'zod';

export async function completeJson<T extends ZodTypeAny>(
  ctx: CallContext,
  input: CompleteInput,
  schema: T,
): Promise<{ data: z.infer<T>; result: CompleteResult }> {
  const result = await complete(ctx, { ...input, jsonMode: true });
  if (result.json === undefined) {
    throw new Error(`llm.completeJson: model did not return parseable JSON (text=${result.text.slice(0, 200)})`);
  }
  const parsed = schema.safeParse(result.json);
  if (!parsed.success) {
    throw new Error(`llm.completeJson: response failed schema (${parsed.error.message})`);
  }
  return { data: parsed.data, result };
}
