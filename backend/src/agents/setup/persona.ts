// LLM: yes — creative. Each persona owns its format mix (carousel vs single image), per CLAUDE.md.

import { z } from 'zod';
import { completeJson } from '../../llm/index.js';
import type { RunContext } from '../runAgent.js';
import type { ProductSummary } from './parser.js';
import type { AudienceCandidate } from './audience.js';
import type { VoiceCandidate } from './voice.js';

export const PersonaCandidateSchema = z.object({
  name: z.string(),
  description: z.string(),
  formatMixCarouselPct: z.number().int().min(0).max(100),
  formatMixSinglePct: z.number().int().min(0).max(100),
});

export const PersonaListSchema = z.object({
  personas: z.array(PersonaCandidateSchema).length(5),
});

export type PersonaCandidate = z.infer<typeof PersonaCandidateSchema>;

export async function runPersonaGenerator(
  ctx: RunContext,
  input: { summary: ProductSummary; audiences: AudienceCandidate[]; voices: VoiceCandidate[] },
): Promise<PersonaCandidate[]> {
  const { data } = await completeJson(
    { projectId: ctx.projectId, runId: ctx.runId, nodeId: 'persona' },
    {
      system:
        'You are a content strategist. Define FIVE distinct authoring personas for the brand. ' +
        'A persona is a *consistent writing identity* (e.g. "Veteran Recruiter", "Pragmatic Founder", "Resident Skeptic"), not a target audience. ' +
        'Each persona has its own format mix: formatMixCarouselPct + formatMixSinglePct must sum to exactly 100. ' +
        'Australian/British English. Return ONLY valid JSON.',
      user:
        `Product: ${input.summary.productName} — ${input.summary.oneLiner}\n` +
        `Audiences: ${input.audiences.map((a) => a.name).join(', ')}\n` +
        `Voices: ${input.voices.map((v) => v.name).join(', ')}\n\n` +
        `Return JSON: { "personas": [{"name": "...", "description": "what this persona writes about and how", "formatMixCarouselPct": 70, "formatMixSinglePct": 30}, ...] } — exactly 5 items.`,
      maxTokens: 1400,
      temperature: 0.85,
    },
    PersonaListSchema,
  );

  // Enforce the sum-to-100 invariant; correct silently if the model is off by a few.
  return data.personas.map((p) => {
    const total = p.formatMixCarouselPct + p.formatMixSinglePct;
    if (total === 100) return p;
    const corrected = Math.round((p.formatMixCarouselPct / total) * 100);
    return { ...p, formatMixCarouselPct: corrected, formatMixSinglePct: 100 - corrected };
  });
}
