// LLM: yes — creative.

import { z } from 'zod';
import { completeJson } from '../../llm/index.js';
import type { RunContext } from '../runAgent.js';
import type { ProductSummary } from './parser.js';

export const VoiceCandidateSchema = z.object({
  name: z.string(),
  description: z.string(),
  examples: z.array(z.string()).min(2).max(4),
});

export const VoiceListSchema = z.object({
  voices: z.array(VoiceCandidateSchema).length(4),
});

export type VoiceCandidate = z.infer<typeof VoiceCandidateSchema>;

export async function runVoiceGenerator(ctx: RunContext, summary: ProductSummary): Promise<VoiceCandidate[]> {
  const { data } = await completeJson(
    { projectId: ctx.projectId, runId: ctx.runId, nodeId: 'voice' },
    {
      system:
        'You are a brand voice consultant. Given a product summary, propose FOUR distinct voice directions. ' +
        "Each voice must be operationally usable: it should give a writer immediate cues for word choice, sentence rhythm, and what NOT to do. " +
        'No em-dashes between sentences in user-facing copy examples. Australian/British English in any words that vary by region. ' +
        'Return ONLY valid JSON.',
      user:
        `Product: ${summary.productName}\n` +
        `Brand tone hint from brief: ${summary.brandTone}\n` +
        `Off-limits topics: ${summary.offLimits.join(', ') || 'none'}\n\n` +
        `Return JSON: { "voices": [{"name": "...", "description": "1-2 sentences on the voice including what it avoids", "examples": ["short example line 1", "short example line 2"]}, ...] } — exactly 4 items.`,
      maxTokens: 1400,
      temperature: 0.9,
    },
    VoiceListSchema,
  );
  return data.voices;
}
