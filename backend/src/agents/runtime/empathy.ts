// LLM: yes — judgment of tone is subjective; rules can't capture it.

import { z } from 'zod';
import { completeJson } from '../../llm/index.js';
import type { RunContext } from '../runAgent.js';
import type { DraftContent } from './writer.js';

export const EmpathyReportSchema = z.object({
  verdict: z.enum(['helpful', 'performative', 'tone_deaf']),
  reason: z.string(),
});

export type EmpathyReport = z.infer<typeof EmpathyReportSchema>;

export async function empathyCheck(ctx: RunContext, draft: DraftContent): Promise<EmpathyReport> {
  const flat = draft.slides.map((s, i) => `Slide ${i + 1} [${s.kind}]: ${s.title ?? ''}\n${s.body}`).join('\n\n');
  const { data } = await completeJson(
    { projectId: ctx.projectId, runId: ctx.runId, nodeId: 'empathy' },
    {
      system:
        'You are an empathy critic. Read the post and classify it into exactly one of three buckets:\n' +
        '- "helpful": the reader gets something concrete they did not have before — knowledge, a tactic, a frame, an example.\n' +
        '- "performative": the post looks insightful but says nothing the reader can act on. Buzzwords. Hot takes for the sake of it. Triggers a regeneration.\n' +
        '- "tone_deaf": the post is dismissive, condescending, exploitative of difficulty, or otherwise embarrassing for a brand to publish. Hard fail.\n\n' +
        'Be honest. Most middling drafts are "performative". Return ONLY JSON.',
      user: `Post:\n${flat}\n\nReturn JSON: { "verdict": "helpful"|"performative"|"tone_deaf", "reason": "1 sentence justification" }.`,
      maxTokens: 300,
      temperature: 0.2,
    },
    EmpathyReportSchema,
  );
  return data;
}
