import { and, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { brandKits, projects, voices, type Project } from '../../db/schema.js';
import { createDraft } from '../../db/repos/drafts.js';
import { finishRun, runAgent, startRun, type RunContext } from '../runAgent.js';
import { plan } from './planner.js';
import { research } from './researcher.js';
import { write } from './writer.js';
import { empathyCheck } from './empathy.js';
import { safetyCheck } from './safety.js';
import { edit } from './editor.js';
import { packInstagram, packLinkedIn } from './packagers.js';

export interface TriggerInput {
  project: Project;
  triggeredByUserId: string;
}

/**
 * Real runtime pipeline. Fan-out: planner → researcher → writer → (empathy ‖ safety) → editor →
 * (linkedin ‖ instagram) → analyst (skipped for now). Persists a single Draft + its slides
 * at the end, with both packager captions attached.
 *
 * Hard fails (skip persistence):
 * - Empathy verdict tone_deaf
 * - Safety verdict fail AFTER one editor pass (we let Editor try to fix on first failure)
 */
export function triggerRuntimeRun(input: TriggerInput): Promise<{ runId: string }> {
  return startRun({
    projectId: input.project.id,
    pipeline: 'runtime',
    triggeredByUserId: input.triggeredByUserId,
  }).then((ctx) => {
    (async () => {
      try {
        await runRuntimePipeline(ctx, input.project);
        await finishRun(ctx.runId, true);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[runtime] run failed', { runId: ctx.runId, error: message });
        await finishRun(ctx.runId, false, message).catch(() => {});
      }
    })();
    return { runId: ctx.runId };
  });
}

async function runRuntimePipeline(ctx: RunContext, project: Project): Promise<void> {
  // 0. Load project-scoped state the agents need.
  const [[projectRow], [voice], [brandKit]] = await Promise.all([
    db.select().from(projects).where(eq(projects.id, project.id)).limit(1),
    db.select().from(voices).where(and(eq(voices.projectId, project.id), eq(voices.isSelected, true))).limit(1)
      .then(async (r) => (r.length ? r : db.select().from(voices).where(eq(voices.projectId, project.id)).limit(1))),
    db.select().from(brandKits).where(eq(brandKits.projectId, project.id)).limit(1),
  ]);
  void projectRow;
  void brandKit; // Designer will use this in Phase 5.

  // 1. Plan (no LLM)
  const picked = await runAgent({
    ctx,
    nodeId: 'planner',
    agentName: 'Planner',
    input: { projectId: project.id },
    fn: () => plan(project.id),
  });

  // 2. Research (LLM)
  const researchOut = await runAgent({
    ctx,
    nodeId: 'researcher',
    agentName: 'Researcher',
    input: { persona: picked.persona.name, theme: picked.theme.label, format: picked.format },
    fn: () => research(ctx, { plan: picked, summary: null, productName: project.name }),
  });

  // 3. Write (LLM)
  let draft = await runAgent({
    ctx,
    nodeId: 'writer',
    agentName: 'Writer',
    input: { angle: researchOut.angle, keyPoints: researchOut.keyPoints.length },
    fn: () => write(ctx, { plan: picked, voice: voice ?? null, research: researchOut }),
  });

  // 4. Empathy + Safety in parallel
  let [empathy, safety] = await Promise.all([
    runAgent({
      ctx,
      nodeId: 'empathy',
      agentName: 'Empathy Critic',
      input: { slideCount: draft.slides.length },
      fn: () => empathyCheck(ctx, draft),
    }),
    runAgent({
      ctx,
      nodeId: 'safety',
      agentName: 'Brand Safety',
      input: { slideCount: draft.slides.length, kind: picked.kind },
      fn: () => safetyCheck(ctx, draft, picked.kind),
    }),
  ]);

  // Hard fail on tone_deaf — don't even try to edit.
  if (empathy.verdict === 'tone_deaf') {
    throw new Error(`empathy_tone_deaf: ${empathy.reason}`);
  }

  // 5. Editor (LLM, short-circuits if everything's already clean)
  draft = await runAgent({
    ctx,
    nodeId: 'editor',
    agentName: 'Editor',
    input: { empathyVerdict: empathy.verdict, safetyReasons: safety.reasons.length },
    fn: () => edit(ctx, { draft, empathy, safety }),
  });

  // Re-check safety after editor pass. If still failing, the draft persists with safety='fail'
  // so the operator sees it in the queue rather than silently dropping it.
  if (safety.verdict === 'fail') {
    safety = await safetyCheck(ctx, draft, picked.kind);
  }

  // 6. Packagers (no LLM)
  const linkedin = await runAgent({
    ctx,
    nodeId: 'linkedin',
    agentName: 'LinkedIn Packager',
    input: { slideCount: draft.slides.length },
    fn: async () => packLinkedIn({ draft, plan: picked }),
  });

  const instagram = await runAgent({
    ctx,
    nodeId: 'instagram',
    agentName: 'Instagram Packager',
    input: { slideCount: draft.slides.length },
    fn: async () => packInstagram({ draft, plan: picked }),
  });

  // 7. Analyst (placeholder for now — pure DB read, no LLM)
  await runAgent({
    ctx,
    nodeId: 'analyst',
    agentName: 'Analyst',
    input: { runId: ctx.runId },
    fn: async () => ({ note: 'analyst_skipped_in_phase_4_pending_engagement_data' }),
  });

  // Persist a Draft + slides for the operator queue.
  await createDraft({
    projectId: project.id,
    runId: ctx.runId,
    personaId: picked.persona.id,
    themeId: picked.theme.id,
    format: draft.format,
    topicTitle: draft.topicTitle,
    angle: researchOut.angle,
    kind: picked.kind,
    empathyVerdict: empathy.verdict,
    safetyVerdict: safety.verdict,
    safetyReasons: safety.reasons,
    linkedinCaption: linkedin,
    instagramCaption: instagram,
    slides: draft.slides.map((s, i) => ({
      slideIndex: i,
      kind: s.kind,
      title: s.title,
      body: s.body,
    })),
  });
}
