// LLM: yes — open-ended text understanding (PRD / brief → structured summary).

import { z } from 'zod';
import { completeJson } from '../../llm/index.js';
import type { RunContext } from '../runAgent.js';

export const ProductSummarySchema = z.object({
  productName: z.string(),
  oneLiner: z.string(),
  problemSolved: z.string(),
  coreFeatures: z.array(z.string()).min(1).max(12),
  primaryBenefit: z.string(),
  differentiators: z.array(z.string()).max(8).default([]),
  brandTone: z.string(),
  offLimits: z.array(z.string()).default([]),
});

export type ProductSummary = z.infer<typeof ProductSummarySchema>;

export interface ParserInput {
  projectName: string;
  brief: string;
}

export async function runParser(ctx: RunContext, input: ParserInput): Promise<ProductSummary> {
  const { data } = await completeJson(
    { projectId: ctx.projectId, runId: ctx.runId, nodeId: 'parser' },
    {
      system:
        'You are a product analyst. Read the brief and return a tight structured summary of the product. ' +
        'Be precise. Do not invent features that are not in the brief. Australian/British English spelling in user-facing fields. ' +
        'Return ONLY valid JSON matching the requested schema.',
      user: `Project name: ${input.projectName}\n\nBrief:\n"""\n${input.brief}\n"""\n\nReturn a JSON object with keys: productName (string), oneLiner (string, under 100 chars), problemSolved (string), coreFeatures (string[]), primaryBenefit (string), differentiators (string[]), brandTone (string, 2-6 words), offLimits (string[], topics to avoid in marketing).`,
      maxTokens: 1200,
      temperature: 0.3,
    },
    ProductSummarySchema,
  );
  return data;
}
