// Phase 3.5 stub agents: each sleeps briefly and returns mock data so the
// filter graph lights up end-to-end. Real implementations land in Phase 4+.

import { runAgent, type RunContext } from '../runAgent.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const STUB_DELAY_MS = 600;

export async function runRuntimePipelineStub(ctx: RunContext): Promise<void> {
  const plan = await runAgent({
    ctx,
    nodeId: 'planner',
    agentName: 'Planner',
    input: { trigger: 'manual' },
    fn: async () => {
      await sleep(STUB_DELAY_MS);
      return {
        persona: 'Veteran Engineer',
        theme: 'Interview prep traps',
        format: 'carousel' as const,
      };
    },
  });

  const research = await runAgent({
    ctx,
    nodeId: 'researcher',
    agentName: 'Researcher',
    input: plan,
    fn: async (p) => {
      await sleep(STUB_DELAY_MS);
      return { topic: p.theme, facts: ['fact-1', 'fact-2', 'fact-3'] };
    },
  });

  const draft = await runAgent({
    ctx,
    nodeId: 'writer',
    agentName: 'Writer',
    input: research,
    fn: async () => {
      await sleep(STUB_DELAY_MS);
      return {
        slides: [
          { kind: 'cover', title: 'Stub slide 1' },
          { kind: 'bullet-list', title: 'Stub slide 2' },
        ],
      };
    },
  });

  // Empathy + Safety in parallel — both feed Editor.
  const [empathy, safety] = await Promise.all([
    runAgent({
      ctx,
      nodeId: 'empathy',
      agentName: 'Empathy Critic',
      input: draft,
      fn: async () => {
        await sleep(STUB_DELAY_MS);
        return { verdict: 'helpful' as const };
      },
    }),
    runAgent({
      ctx,
      nodeId: 'safety',
      agentName: 'Brand Safety',
      input: draft,
      fn: async () => {
        await sleep(STUB_DELAY_MS);
        return { verdict: 'pass' as const, helpfulnessRatioOk: true };
      },
    }),
  ]);

  const final = await runAgent({
    ctx,
    nodeId: 'editor',
    agentName: 'Editor',
    input: { draft, empathy, safety },
    fn: async (i) => {
      await sleep(STUB_DELAY_MS);
      return { slides: i.draft.slides };
    },
  });

  const designed = await runAgent({
    ctx,
    nodeId: 'designer',
    agentName: 'Designer',
    input: final,
    fn: async () => {
      await sleep(STUB_DELAY_MS);
      return { slideImages: ['stub://slide-1.png', 'stub://slide-2.png'] };
    },
  });

  const [linkedin, instagram] = await Promise.all([
    runAgent({
      ctx,
      nodeId: 'linkedin',
      agentName: 'LinkedIn Packager',
      input: designed,
      fn: async () => {
        await sleep(STUB_DELAY_MS);
        return { caption: 'Stub LinkedIn caption' };
      },
    }),
    runAgent({
      ctx,
      nodeId: 'instagram',
      agentName: 'Instagram Packager',
      input: designed,
      fn: async () => {
        await sleep(STUB_DELAY_MS);
        return { caption: 'Stub Instagram caption' };
      },
    }),
  ]);

  await runAgent({
    ctx,
    nodeId: 'analyst',
    agentName: 'Analyst',
    input: { linkedin, instagram },
    fn: async () => {
      await sleep(STUB_DELAY_MS);
      return { summary: 'No past posts yet; nothing to compare.' };
    },
  });
}
