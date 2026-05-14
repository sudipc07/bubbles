import { Router } from 'express';
import { z } from 'zod';
import {
  decideDraft,
  getDraftForMember,
  listDraftsForProject,
  markPosted,
} from '../../db/repos/drafts.js';
import { findProjectByIdForMember } from '../../db/repos/projects.js';
import { requireUser } from '../middleware/session.js';

export const draftsRoutes = Router();

draftsRoutes.use(requireUser);

const listSchema = z.object({
  filter: z.enum(['all', 'pending', 'decided']).default('all'),
});

draftsRoutes.get('/:projectId/drafts', async (req, res) => {
  const project = await findProjectByIdForMember(req.params.projectId, req.user!.id);
  if (!project) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input' });
    return;
  }
  const list = await listDraftsForProject(project.id, parsed.data.filter);
  res.json({ drafts: list });
});

draftsRoutes.get('/:projectId/drafts/:draftId', async (req, res) => {
  const project = await findProjectByIdForMember(req.params.projectId, req.user!.id);
  if (!project) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const data = await getDraftForMember(req.params.draftId, project.id);
  if (!data) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json(data);
});

const decideSchema = z.object({ decision: z.enum(['approved', 'rejected']) });

draftsRoutes.post('/:projectId/drafts/:draftId/decide', async (req, res) => {
  const project = await findProjectByIdForMember(req.params.projectId, req.user!.id);
  if (!project) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const parsed = decideSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input' });
    return;
  }
  const updated = await decideDraft({
    draftId: req.params.draftId,
    projectId: project.id,
    userId: req.user!.id,
    decision: parsed.data.decision,
  });
  if (!updated) {
    res.status(409).json({ error: 'not_pending_or_not_found' });
    return;
  }
  res.json({ draft: updated });
});

const postedSchema = z.object({ url: z.string().url() });

draftsRoutes.post('/:projectId/drafts/:draftId/posted', async (req, res) => {
  const project = await findProjectByIdForMember(req.params.projectId, req.user!.id);
  if (!project) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const parsed = postedSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input' });
    return;
  }
  const updated = await markPosted({
    draftId: req.params.draftId,
    projectId: project.id,
    postedUrl: parsed.data.url,
  });
  if (!updated) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({ draft: updated });
});
