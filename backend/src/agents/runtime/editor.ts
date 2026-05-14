// LLM: yes — refinement is creative. Tightens wording given the critic reports.

import { completeJson } from '../../llm/index.js';
import type { RunContext } from '../runAgent.js';
import { DraftContentSchema, type DraftContent } from './writer.js';
import type { EmpathyReport } from './empathy.js';
import type { SafetyReport } from './safety.js';

export async function edit(
  ctx: RunContext,
  input: { draft: DraftContent; empathy: EmpathyReport; safety: SafetyReport },
): Promise<DraftContent> {
  // Short-circuit: if everything's already good, no need to spend tokens.
  if (input.empathy.verdict === 'helpful' && input.safety.reasons.length === 0) {
    return input.draft;
  }

  const fixes: string[] = [];
  if (input.empathy.verdict === 'performative') {
    fixes.push(`Empathy: ${input.empathy.reason}. Make every slide carry a specific, actionable insight.`);
  }
  if (input.safety.reasons.length > 0) {
    fixes.push(`Safety flags to remove: ${input.safety.reasons.join('; ')}.`);
  }

  const { data } = await completeJson(
    { projectId: ctx.projectId, runId: ctx.runId, nodeId: 'editor' },
    {
      system:
        'You are a senior editor. Rewrite the provided draft to fix the listed issues. Keep the same ' +
        'slide count, kinds, and overall structure. Do not change format or topic. No em-dashes between ' +
        'sentences. Australian/British English. Return ONLY JSON in the same shape as the input.',
      user:
        `Original draft:\n${JSON.stringify(input.draft, null, 2)}\n\n` +
        `Required fixes:\n- ${fixes.join('\n- ')}\n\n` +
        `Return the corrected draft as JSON: { "format": "${input.draft.format}", "topicTitle": "...", "slides": [...] }`,
      maxTokens: 1800,
      temperature: 0.6,
    },
    DraftContentSchema,
  );
  return data;
}
