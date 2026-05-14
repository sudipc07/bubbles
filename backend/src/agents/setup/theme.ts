// LLM: yes — creative.

import { z } from 'zod';
import { completeJson } from '../../llm/index.js';
import type { RunContext } from '../runAgent.js';
import type { ProductSummary } from './parser.js';

export const ThemeCandidateSchema = z.object({
  label: z.string(),
  description: z.string(),
  exampleAngles: z.array(z.string()).min(2).max(5),
});

export const ThemeListSchema = z.object({
  themes: z.array(ThemeCandidateSchema).min(8).max(10),
});

export type ThemeCandidate = z.infer<typeof ThemeCandidateSchema>;

export async function runThemeGenerator(ctx: RunContext, summary: ProductSummary): Promise<ThemeCandidate[]> {
  const { data } = await completeJson(
    { projectId: ctx.projectId, runId: ctx.runId, nodeId: 'theme' },
    {
      system:
        'You are a content director. Propose 8-10 distinct *content themes* the brand can sustain over months without repeating itself. ' +
        'A theme is a topic territory (e.g. "Negotiation traps", "Hiring red flags"), each with 2-5 example angles. ' +
        'Themes must reflect the product\'s genuine helpfulness, not promotional pitches. Australian/British English. ' +
        'Return ONLY valid JSON.',
      user:
        `Product: ${summary.productName}\n` +
        `Problem solved: ${summary.problemSolved}\n` +
        `Primary benefit: ${summary.primaryBenefit}\n` +
        `Core features: ${summary.coreFeatures.join('; ')}\n` +
        `Off-limits: ${summary.offLimits.join(', ') || 'none'}\n\n` +
        `Return JSON: { "themes": [{"label": "...", "description": "1-2 sentences", "exampleAngles": ["...", "..."]}, ...] } — 8 to 10 items.`,
      maxTokens: 1800,
      temperature: 0.85,
    },
    ThemeListSchema,
  );
  return data.themes;
}
