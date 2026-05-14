// LLM: yes — creative generation of plausible audience profiles.

import { z } from 'zod';
import { completeJson } from '../../llm/index.js';
import type { RunContext } from '../runAgent.js';
import type { ProductSummary } from './parser.js';

export const AudienceCandidateSchema = z.object({
  name: z.string(),
  summary: z.string(),
  traits: z.array(z.string()).min(2).max(8),
});

export const AudienceListSchema = z.object({
  audiences: z.array(AudienceCandidateSchema).length(4),
});

export type AudienceCandidate = z.infer<typeof AudienceCandidateSchema>;

export async function runAudienceGenerator(ctx: RunContext, summary: ProductSummary): Promise<AudienceCandidate[]> {
  const { data } = await completeJson(
    { projectId: ctx.projectId, runId: ctx.runId, nodeId: 'audience' },
    {
      system:
        'You are an audience strategist. Given a product summary, generate FOUR distinct audience profiles for the product. ' +
        'Each profile must be a real, specific segment (not "everyone"), and the four must meaningfully differ from each other. ' +
        'Australian/British English. Return ONLY valid JSON.',
      user:
        `Product: ${summary.productName}\n` +
        `One-liner: ${summary.oneLiner}\n` +
        `Problem: ${summary.problemSolved}\n` +
        `Primary benefit: ${summary.primaryBenefit}\n` +
        `Brand tone: ${summary.brandTone}\n\n` +
        `Return JSON: { "audiences": [{"name": "...", "summary": "1-2 sentences", "traits": ["...", "..."]}, ...] } — exactly 4 items, each meaningfully distinct.`,
      maxTokens: 1200,
      temperature: 0.8,
    },
    AudienceListSchema,
  );
  return data.audiences;
}
