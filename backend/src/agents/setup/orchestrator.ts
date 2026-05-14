import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { audiences, brandKits, personas, samples, themes, voices, type Project } from '../../db/schema.js';
import { newId } from '../../lib/id.js';
import { finishRun, runAgent, startRun, type RunContext } from '../runAgent.js';
import { runParser } from './parser.js';
import { runAudienceGenerator } from './audience.js';
import { runVoiceGenerator } from './voice.js';
import { runPersonaGenerator } from './persona.js';
import { runThemeGenerator } from './theme.js';
import { runBrandKit } from './brandkit.js';
import { runSampleGenerator } from './sample.js';

export interface SetupTriggerInput {
  project: Project;
  triggeredByUserId: string;
}

/**
 * Kick off the 7-agent setup pipeline. Returns the runId immediately;
 * the pipeline executes in the background and emits events via SSE.
 *
 * Stores generated audiences/voices/personas/themes/brand kit/samples into
 * their respective tables. Wipes prior setup output for the project so a
 * re-run is destructive — this is acceptable while the wizard UI is not yet
 * built; once the user can pick options, we switch to additive writes.
 */
export async function triggerSetupRun(input: SetupTriggerInput): Promise<{ runId: string }> {
  if (!input.project.brief || input.project.brief.trim().length < 30) {
    throw new Error('brief_too_short');
  }

  const ctx = await startRun({
    projectId: input.project.id,
    pipeline: 'setup',
    triggeredByUserId: input.triggeredByUserId,
  });

  // Fire-and-forget.
  (async () => {
    try {
      await wipePriorSetup(input.project.id);
      await runSetupPipeline(ctx, input.project);
      await finishRun(ctx.runId, true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[setup] run failed', { runId: ctx.runId, error: msg });
      await finishRun(ctx.runId, false, msg).catch(() => {});
    }
  })();

  return { runId: ctx.runId };
}

async function wipePriorSetup(projectId: string): Promise<void> {
  // Order matters: samples FK personas, so personas first would cascade.
  await db.delete(audiences).where(eq(audiences.projectId, projectId));
  await db.delete(voices).where(eq(voices.projectId, projectId));
  await db.delete(themes).where(eq(themes.projectId, projectId));
  await db.delete(brandKits).where(eq(brandKits.projectId, projectId));
  await db.delete(personas).where(eq(personas.projectId, projectId)); // cascades samples
}

async function runSetupPipeline(ctx: RunContext, project: Project): Promise<void> {
  // 1. Parser — synchronous prerequisite for everything else.
  const summary = await runAgent({
    ctx,
    nodeId: 'parser',
    agentName: 'Parser',
    input: { brief: project.brief!.slice(0, 8000) },
    fn: () => runParser(ctx, { projectName: project.name, brief: project.brief! }),
  });

  // 2-3. Audience + Voice in parallel; both depend only on summary.
  const [audienceList, voiceList] = await Promise.all([
    runAgent({
      ctx,
      nodeId: 'audience',
      agentName: 'Audience Generator',
      input: summary,
      fn: () => runAudienceGenerator(ctx, summary),
    }),
    runAgent({
      ctx,
      nodeId: 'voice',
      agentName: 'Voice Generator',
      input: summary,
      fn: () => runVoiceGenerator(ctx, summary),
    }),
  ]);

  await db.insert(audiences).values(
    audienceList.map((a) => ({
      id: newId(),
      projectId: project.id,
      name: a.name,
      summary: a.summary,
      traits: a.traits,
    })),
  );
  await db.insert(voices).values(
    voiceList.map((v) => ({
      id: newId(),
      projectId: project.id,
      name: v.name,
      description: v.description,
      examples: v.examples,
    })),
  );

  // 4. Persona — depends on audience + voice.
  const personaList = await runAgent({
    ctx,
    nodeId: 'persona',
    agentName: 'Persona Generator',
    input: { summary, audiences: audienceList, voices: voiceList },
    fn: () => runPersonaGenerator(ctx, { summary, audiences: audienceList, voices: voiceList }),
  });

  const personaRows = personaList.map((p) => ({
    id: newId(),
    projectId: project.id,
    name: p.name,
    description: p.description,
    formatMixCarouselPct: p.formatMixCarouselPct,
    formatMixSinglePct: p.formatMixSinglePct,
  }));
  await db.insert(personas).values(personaRows);
  const personaIdByName = new Map(personaRows.map((p) => [p.name, p.id]));

  // 5-6. Theme + BrandKit in parallel.
  const [themeList, brandKit] = await Promise.all([
    runAgent({
      ctx,
      nodeId: 'theme',
      agentName: 'Theme Generator',
      input: summary,
      fn: () => runThemeGenerator(ctx, summary),
    }),
    runAgent({
      ctx,
      nodeId: 'brandkit',
      agentName: 'Brand Kit',
      input: { summary, logoUrl: project.logoUrl },
      fn: () => runBrandKit(ctx, { summary, logoUrl: project.logoUrl }),
    }),
  ]);

  await db.insert(themes).values(
    themeList.map((t) => ({
      id: newId(),
      projectId: project.id,
      label: t.label,
      description: t.description,
      exampleAngles: t.exampleAngles,
    })),
  );
  await db.insert(brandKits).values({
    id: newId(),
    projectId: project.id,
    palette: brandKit.palette,
    fonts: brandKit.fonts,
    logoUrl: project.logoUrl,
  });

  // 7. Sample — depends on everything.
  const samplesByPersona = await runAgent({
    ctx,
    nodeId: 'sample',
    agentName: 'Sample Generator',
    input: { personas: personaList.map((p) => p.name) },
    fn: () =>
      runSampleGenerator(ctx, {
        summary,
        voice: voiceList[0]!,
        personas: personaList,
        themes: themeList,
      }),
  });

  const sampleRows = samplesByPersona.flatMap((b) => {
    const personaId = personaIdByName.get(b.personaName);
    if (!personaId) return [];
    return b.samples.map((s) => ({
      id: newId(),
      projectId: project.id,
      personaId,
      format: s.format,
      title: s.title,
      body: s.body,
    }));
  });
  if (sampleRows.length > 0) {
    await db.insert(samples).values(sampleRows);
  }
}
