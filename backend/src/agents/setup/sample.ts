// LLM: yes — produce 2 sample posts per persona for operator approval.

import { z } from 'zod';
import { completeJson } from '../../llm/index.js';
import type { RunContext } from '../runAgent.js';
import type { ProductSummary } from './parser.js';
import type { VoiceCandidate } from './voice.js';
import type { PersonaCandidate } from './persona.js';
import type { ThemeCandidate } from './theme.js';

const SampleSchema = z.object({
  format: z.enum(['carousel', 'single_image']),
  title: z.string(),
  body: z.string(),
});

const SampleBatchSchema = z.object({
  samples: z.array(SampleSchema).length(2),
});

export interface PersonaSamples {
  personaName: string;
  samples: { format: 'carousel' | 'single_image'; title: string; body: string }[];
}

export async function runSampleGenerator(
  ctx: RunContext,
  input: {
    summary: ProductSummary;
    voice: VoiceCandidate;
    personas: PersonaCandidate[];
    themes: ThemeCandidate[];
  },
): Promise<PersonaSamples[]> {
  const themesShort = input.themes.slice(0, 5).map((t) => t.label).join(', ');

  // One LLM call per persona — they're independent and produce different outputs.
  // Parallelism keeps the wall-clock time reasonable for 5 personas.
  const promises = input.personas.map(async (persona): Promise<PersonaSamples> => {
    const { data } = await completeJson(
      { projectId: ctx.projectId, runId: ctx.runId, nodeId: 'sample' },
      {
        system:
          'You are a senior content writer. Produce TWO sample posts for the given persona. ' +
          'One must respect the persona\'s format mix (heavier weighting goes first). ' +
          'No em-dashes between sentences. Australian/British English. ' +
          'Each sample is concrete and useful — no fluff, no calls to action that point at the product. ' +
          'Return ONLY valid JSON.',
        user:
          `Product: ${input.summary.productName} — ${input.summary.oneLiner}\n` +
          `Voice: ${input.voice.name} — ${input.voice.description}\n` +
          `Persona: ${persona.name} — ${persona.description}\n` +
          `Format mix: carousel ${persona.formatMixCarouselPct}% / single_image ${persona.formatMixSinglePct}%\n` +
          `Available themes (pick from these or adjacent): ${themesShort}\n\n` +
          `Return JSON: { "samples": [{"format": "carousel"|"single_image", "title": "...", "body": "for carousel: 5-8 slides separated by \\n\\n. for single_image: 1-3 short paragraphs."}, {"format": "...", "title": "...", "body": "..."}] } — exactly 2 samples; pick the format weights deliberately based on the persona's mix.`,
        maxTokens: 1400,
        temperature: 0.85,
      },
      SampleBatchSchema,
    );
    return { personaName: persona.name, samples: data.samples };
  });

  return Promise.all(promises);
}
