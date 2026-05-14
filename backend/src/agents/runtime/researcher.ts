// LLM: yes — gather concrete facts and angles for the topic.

import { z } from 'zod';
import { completeJson } from '../../llm/index.js';
import type { RunContext } from '../runAgent.js';
import type { Plan } from './planner.js';
import type { ProductSummary } from '../setup/parser.js';

export const ResearchSchema = z.object({
  angle: z.string(),
  keyPoints: z.array(z.string()).min(3).max(8),
  examples: z.array(z.string()).max(5).default([]),
  pitfalls: z.array(z.string()).max(5).default([]),
});

export type Research = z.infer<typeof ResearchSchema>;

export async function research(
  ctx: RunContext,
  input: { plan: Plan; summary: ProductSummary | null; productName: string },
): Promise<Research> {
  const { data } = await completeJson(
    { projectId: ctx.projectId, runId: ctx.runId, nodeId: 'researcher' },
    {
      system:
        'You are a content researcher. Given a persona, a topic theme, and a target format, ' +
        'produce a tight content brief: a specific angle and 3-8 key points that a writer can ' +
        'turn directly into slides. Be concrete and useful. Avoid platitudes. ' +
        'Australian/British English. Return ONLY valid JSON.',
      user:
        `Product: ${input.productName}\n` +
        (input.summary ? `Product summary: ${input.summary.oneLiner}\n` : '') +
        `Persona: ${input.plan.persona.name} — ${input.plan.persona.description}\n` +
        `Theme: ${input.plan.theme.label} — ${input.plan.theme.description}\n` +
        `Example angles available: ${input.plan.theme.exampleAngles.join(' | ')}\n` +
        `Target format: ${input.plan.format}\n\n` +
        `Return JSON: { "angle": "a specific take or hook, 1 sentence", "keyPoints": ["3-8 specific points the writer should cover, each concrete enough to fit on one slide"], "examples": ["optional real-world examples"], "pitfalls": ["optional common misconceptions to avoid in copy"] }.`,
      maxTokens: 1200,
      temperature: 0.7,
    },
    ResearchSchema,
  );
  return data;
}
