// LLM: yes — the core creative act.

import { z } from 'zod';
import { completeJson } from '../../llm/index.js';
import type { RunContext } from '../runAgent.js';
import type { Plan } from './planner.js';
import type { Research } from './researcher.js';
import type { Voice } from '../../db/schema.js';

const SlideSchema = z.object({
  kind: z.enum(['cover', 'bullet-list', 'quote', 'stat', 'cta', 'body']),
  title: z.string().nullable(),
  body: z.string(),
});

export const CarouselDraftSchema = z.object({
  format: z.literal('carousel'),
  topicTitle: z.string(),
  slides: z.array(SlideSchema).min(3).max(10),
});

export const SingleDraftSchema = z.object({
  format: z.literal('single_image'),
  topicTitle: z.string(),
  slides: z.array(SlideSchema).length(1),
});

export const DraftContentSchema = z.discriminatedUnion('format', [CarouselDraftSchema, SingleDraftSchema]);

export type DraftContent = z.infer<typeof DraftContentSchema>;

export async function write(
  ctx: RunContext,
  input: { plan: Plan; voice: Voice | null; research: Research },
): Promise<DraftContent> {
  const voiceLine = input.voice
    ? `${input.voice.name} — ${input.voice.description}` +
      (input.voice.examples.length > 0 ? `\nVoice examples: ${input.voice.examples.map((e) => `"${e}"`).join(' | ')}` : '')
    : '(no voice configured — write plainly and helpfully)';

  const formatRules =
    input.plan.format === 'carousel'
      ? 'A 5-8 slide carousel. First slide kind="cover" with a strong title and short hook. Middle slides kind="bullet-list" or "body" or "stat" or "quote". Last slide kind="cta" but NEVER promote the product — drive curiosity or action only.'
      : 'A single image. ONE slide of kind="body" with a short title and 2-4 sentences of body copy.';

  const schema = input.plan.format === 'carousel' ? CarouselDraftSchema : SingleDraftSchema;

  const { data } = await completeJson(
    { projectId: ctx.projectId, runId: ctx.runId, nodeId: 'writer' },
    {
      system:
        'You are a senior writer. Produce a single post draft as structured slides. ' +
        'No em-dashes between sentences. Australian/British English. ' +
        'Be useful, not promotional. Do not invent statistics. ' +
        'Return ONLY valid JSON matching the format-specific schema.',
      user:
        `Persona: ${input.plan.persona.name} — ${input.plan.persona.description}\n` +
        `Voice: ${voiceLine}\n` +
        `Theme: ${input.plan.theme.label}\n` +
        `Research angle: ${input.research.angle}\n` +
        `Key points to cover (use as the spine):\n${input.research.keyPoints.map((k, i) => `${i + 1}. ${k}`).join('\n')}\n` +
        (input.research.pitfalls.length > 0 ? `\nAvoid these pitfalls:\n${input.research.pitfalls.map((p) => `- ${p}`).join('\n')}\n` : '') +
        `\nFormat: ${input.plan.format}\n${formatRules}\n\n` +
        `Return JSON: { "format": "${input.plan.format}", "topicTitle": "concise topic title for the operator", "slides": [{"kind": "...", "title": "..." (or null for body), "body": "..."}, ...] }`,
      maxTokens: 1800,
      temperature: 0.85,
    },
    schema,
  );
  return data;
}
