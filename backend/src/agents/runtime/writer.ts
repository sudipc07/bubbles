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
      ? [
          'A 5-8 slide carousel.',
          'Slide 1 must be kind="cover": title under 60 chars, body 1 short hook sentence.',
          'Middle slides: kind ∈ {"bullet-list", "body", "stat", "quote"}. Each slide title under 60 chars; body under 240 chars (fits a 1080×1350 social card).',
          'For bullet-list slides put 3-5 short items separated by newlines in body.',
          'Last slide kind="cta" — drive curiosity or reflection, NEVER promote the product directly.',
        ].join(' ')
      : [
          'A single image (1080×1080).',
          'ONE slide of kind="body".',
          'Title: under 50 characters. Body: 1-2 short punchy sentences, HARD MAXIMUM 180 characters.',
          'If you cannot make the point in 180 characters, choose a smaller point. Brevity is the entire job here.',
        ].join(' ');

  const schema = input.plan.format === 'carousel' ? CarouselDraftSchema : SingleDraftSchema;

  const { data } = await completeJson(
    { projectId: ctx.projectId, runId: ctx.runId, nodeId: 'writer' },
    {
      system:
        'You are a senior writer. Produce a single post draft as structured slides. ' +
        'No em-dashes between sentences. Australian/British English. ' +
        'Be useful, not promotional. Do not invent statistics. ' +
        'Headlines on cover slides, single-image slides, and CTA slides may use **double asterisks** to highlight 1-3 key words in the brand accent colour — use this sparingly for emphasis (e.g. "What\'s your **ATS score**?"). Do not asterisk-wrap body text. ' +
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
