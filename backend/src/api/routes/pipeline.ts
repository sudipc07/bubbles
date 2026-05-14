import { Router } from 'express';
import { z } from 'zod';
import { getGraph } from '../../agents/graph.js';
import { findProjectByIdForMember } from '../../db/repos/projects.js';
import { getRunForProject, listRunsForProject, projectMonthlySpendUsd } from '../../db/repos/pipelineRuns.js';
import { requireUser } from '../middleware/session.js';

export const pipeline = Router();

pipeline.use(requireUser);

// GET /api/pipeline/graph?id=runtime — static graph definition (no auth scope; safe to expose).
pipeline.get('/graph', (req, res) => {
  const parsed = z.object({ id: z.enum(['setup', 'runtime']).default('runtime') }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input' });
    return;
  }
  res.json({ graph: getGraph(parsed.data.id) });
});

// GET /api/pipeline/:projectId/runs
pipeline.get('/:projectId/runs', async (req, res) => {
  const { projectId } = req.params;
  const member = await findProjectByIdForMember(projectId, req.user!.id);
  if (!member) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const runs = await listRunsForProject(projectId);
  const monthlyUsd = await projectMonthlySpendUsd(projectId);
  res.json({ runs, monthlySpendUsd: monthlyUsd });
});

// GET /api/pipeline/:projectId/runs/:runId
pipeline.get('/:projectId/runs/:runId', async (req, res) => {
  const { projectId, runId } = req.params;
  const member = await findProjectByIdForMember(projectId, req.user!.id);
  if (!member) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const data = await getRunForProject(runId, projectId);
  if (!data) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json(data);
});
