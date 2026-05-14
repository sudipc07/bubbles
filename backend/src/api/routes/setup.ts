import { Router } from 'express';
import { triggerSetupRun } from '../../agents/setup/orchestrator.js';
import { findProjectByIdForMember } from '../../db/repos/projects.js';
import { loadSetupOutputs } from '../../db/repos/setup.js';
import { checkLimit } from '../../lib/rateLimit.js';
import { CostCeilingExceeded } from '../../llm/index.js';
import { requireUser } from '../middleware/session.js';

export const setup = Router();

setup.use(requireUser);

// GET /api/projects/:projectId/setup  — load all generated setup outputs.
setup.get('/:projectId/setup', async (req, res) => {
  const project = await findProjectByIdForMember(req.params.projectId, req.user!.id);
  if (!project) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const outputs = await loadSetupOutputs(project.id);
  res.json(outputs);
});

// POST /api/projects/:projectId/setup  — owner-only, kicks off the 7-agent setup pipeline.
setup.post('/:projectId/setup', async (req, res) => {
  const project = await findProjectByIdForMember(req.params.projectId, req.user!.id);
  if (!project) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (project.role !== 'owner') {
    res.status(403).json({ error: 'owner_only' });
    return;
  }
  // Cap setup runs (they each fire 7 LLM calls) — 3 per project per day, mirroring
  // the runtime "Generate now" limit.
  const limit = checkLimit(`setup:${project.id}`, 3, 24 * 60 * 60 * 1000);
  if (!limit.allowed) {
    res.status(429).json({ error: 'rate_limited', resetAt: new Date(limit.resetAt).toISOString() });
    return;
  }
  try {
    const { runId } = await triggerSetupRun({ project, triggeredByUserId: req.user!.id });
    res.status(202).json({ runId, remaining: limit.remaining });
  } catch (err) {
    if (err instanceof CostCeilingExceeded) {
      res.status(402).json({ error: 'cost_ceiling_exceeded', spentUsd: err.spentUsd, ceilingUsd: err.ceilingUsd });
      return;
    }
    const message = err instanceof Error ? err.message : 'setup_failed';
    res.status(400).json({ error: message });
  }
});
